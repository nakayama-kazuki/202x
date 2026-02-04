# AWS 環境 + CI 設定

## 1. Bedrock

利用可能な AI モデル探す。

```
$ aws bedrock list-foundation-models --region ap-northeast-1 | grep nova
```

その結果 `ap-northeast-1` でも `amazon.nova-micro-v1:0` を利用できることを確認できたが

```
[ERROR] ValidationException: An error occurred (ValidationException) when calling the InvokeModel operation: Invocation of model ID amazon.nova-micro-v1:0 with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model.
```

の on-demand 非対応となるので [llm.py](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/llm.py) では暫定回避のためにリージョンを変更

```
# client = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
client = boto3.client("bedrock-runtime", region_name="us-east-1")
```

## 2. IAM User + IAM Role + IAM Policy

アプリケーションや CI で使う User / Role / Policy の作成。現在 CI には IAM User を使い、アクセスキーやシークレットを GitHub 側で保持しているが、必要に応じ OIDC ベースの Role への移行を検討する。

|[AppPolicyPersonalitytest.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/AppPolicyPersonalitytest.json)|主な目的は Bedrock での AI モデル呼び出しの許可|
|[CIPolicyCorridorAllow.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/CIPolicyCorridorAllow.json)|CI に対する許可設定|
|[CIPolicyCorridorBoundary.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/CIPolicyCorridorBoundary.json)|CI に対する許可設定の上限 + 拒否設定（防波堤）|

```
iam user
|
+- Lambda
    |
    +- AppRolePersonalitytest 
        |
        +- AppPolicyPersonalitytest.json

iam user ( github-actions )
    |
    +- deploy-corridor.yml
        |
        +- CIPolicyCorridorAllow.json
        |
        +- CIPolicyCorridorBoundary.json
```

## 3. Lambda

- Lambda 環境変数設定
  - `Configuration` → `Environment variables` → `LAMBDA_XXXX=YYYY`
  - テスト環境でも `LAMBDA_XXXX` が [使えるように考慮](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat)
- 試行錯誤をすると Lambda が勝手に Role を作るので消去
- 環境に応じて Python のラッパー層の実装を変更する必要があるので留意
  - コンテナ Python と zip Python
  - CloudFront → Lambda と CloudFront → API Gateway → Lambda
- zip Lambda では Python ファイルは必ず xxxx.py
- Lambda のハンドラ設定で `ファイルのベース名 + "." + 関数名` を指定
  - [llm.py](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/llm.py) の場合 `llm.handler`
- Lambda → 関数 → XXXXX → 設定 → 関数 URL の生成

## 4. CloudFront

- ディストリビューション下にオリジン作成
  - S3（静的コンテンツ）用オリジン
  - Lambda（動的コンテンツ）用オリジン
- ビヘイビアで S3 と Lambda の振り分け設定
- 必要に応じて検討
  - 認証や API のバージョニングを考慮する場合は API Gateway を利用
  - WAF の適用を S3 / Lambda で分けたい場合はディストリビューションも分離
    - その場合はドメインも分離

## 5. WAF

WCU 観点でコスト対効果を考慮した [WAFPolicyCorridor.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/WAFPolicyCorridor.json) を適用。

|GeoRule|攻撃が多い国の IP 遮断|
|GlobalRateBasedRule|リクエスの上限|
|RateBasedRulePOST|POAT / PUT / DELETE の上限|
|AWS-AWSManagedRulesAmazonIpReputationList|AWS 認定攻撃 IP 遮断|
|AWS-AWSManagedRulesAnonymousIpList|トンネリング等身元隠蔽 IP 遮断|

## 6. GitHub

`Repository Settings` → `Secrets and variables` → `Actions` から以下を設定

- `AWS_ACCESS_KEY_ID` ( from 2 )
- `AWS_SECRET_ACCESS_KEY` ( from 2 )
- `AWS_CLOUDFRONT_DISTRIBUTION` ( from 4 )

## 7. CI

[deploy-corridor.yml](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml) にて以下を実行。

- AWS 適用済みポリシー & リポジトリ内の json の整合チェック
- AWS へのデプロイ
  - ルートに配置したファイルの `aws s3 cp`
  - 各ディレクトリの `aws s3 sync`
  - `aws lambda update-function-code`
  - `aws cloudfront create-invalidation`

