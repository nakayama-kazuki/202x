# AWS 環境 + CI 設定

## 1. Certificate Manager @us-east-1

サブドメイン含めて利用するワイルドカード証明書作成。

## 2. Bedrock

利用可能な AI モデル探す。

```
$ aws bedrock list-foundation-models --region ap-northeast-1 | grep nova
```

その結果 `ap-northeast-1` でも `amazon.nova-micro-v1:0` を利用できることを確認できたが

```
[ERROR] ValidationException:
An error occurred (ValidationException) when calling the InvokeModel operation:
Invocation of model ID amazon.nova-micro-v1:0 with on-demand throughput isn't supported.
Retry your request with the ID or ARN of an inference profile that contains this model.
```

と on-demand は非対応なので [llm.py](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/llm.py) では暫定回避のためにリージョンを変更。将来的には inference profile 経由で `ap-northeast-1` に戻すことを検討。

```
# client = boto3.client('bedrock-runtime', region_name='ap-northeast-1')
client = boto3.client("bedrock-runtime", region_name="us-east-1")
```

## 3. IAM User / Role / Policy

アプリケーションや CI で使う User / Role / Policy の作成。現在 CI には IAM User を使い、アクセスキーやシークレットを GitHub 側で保持しているが、必要に応じ OIDC ベースの Role への移行を検討する。

|ポリシー定義|ポリシーの目的|
|---|---|
|[AppPolicyPersonalitytest.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/AppPolicyPersonalitytest.json)|主な目的は Bedrock での AI モデル呼び出しの許可|
|[CIPolicyCorridorAllow.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/CIPolicyCorridorAllow.json)|CI に対する許可設定|
|[CIPolicyCorridorBoundary.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/CIPolicyCorridorBoundary.json)|CI に対する許可設定の上限 + 拒否設定 = 防波堤|

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

## 4. S3

## 5. Lambda

- Lambda 環境変数設定
  - Configuration → Environment variables → `LAMBDA_XXXX=YYYY`
  - テスト環境でも [同じ環境変数を使えるよう](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat) に考慮
- 試行錯誤をすると Lambda が勝手に Role を作るので消去
- 環境に応じて Python のラッパー層の実装を変更する必要があるので留意
  - コンテナ Python と zip Python
  - CloudFront → Lambda と CloudFront → API Gateway → Lambda
- zip Lambda では Python ファイルは必ず `xxxx.py`
- Lambda のハンドラ設定で `ファイルのベース名 + "." + 関数名` を指定
  - [llm.py](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/llm.py) の場合 `llm.handler` となる
- Lambda → 関数 → XXXXX → 設定 → 関数 URL の生成
  - 関数 URL を [プライベート化](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/spot-private-lambda.yml) する場合は API Gateway が必要
  - 疑似的な方法として CloudFront のカスタムヘッダと Lambda の環境変数に秘密情報を保持し、アプリで突合する

## 6. WAF

WCU 観点でコスト対効果を考慮した [WAFPolicyCorridor.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/WAFPolicyCorridor.json) を適用。

|ルールの名称|ルールの目的|
|---|---|
|GeoRule|攻撃が多い国の IP 遮断|
|GlobalRateBasedRule|リクエスの上限|
|RateBasedRulePOST|POAT / PUT / DELETE の上限|
|AWS-AWSManagedRulesAmazonIpReputationList|AWS 認定攻撃 IP 遮断|
|AWS-AWSManagedRulesAnonymousIpList|トンネリング等身元隠蔽 IP 遮断|

## 7. CloudFront

- 静的コンテンツ用ディストリビューション作成
  - オリジンに S3 指定
- 動的コンテンツ用ディストリビューション作成
  - オリジンに Lambda 指定
  - WAF をアタッチ
- 認証や API のバージョニングを考慮する場合は API Gateway の利用も検討

## 8. Route 53

- 静的コンテンツ（S3）用ディストリビューション（CloudFront URL）向け A レコード追加
- 動的コンテンツ（Lambda）用ディストリビューション（CloudFront URL）向け A レコード追加

## 9. GitHub

Repository Settings → Secrets and variables → Actions から以下を設定

- `AWS_ACCESS_KEY_ID` ( from 2 )
- `AWS_SECRET_ACCESS_KEY` ( from 2 )
- `AWS_CLOUDFRONT_DISTRIBUTION` ( from 5 )

## 10. CI

[deploy-corridor.yml](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml) にて以下を実行。

- AWS 適用済みポリシー & リポジトリ内の json の整合チェック
- AWS へのデプロイ
  - ルートに配置したファイルの `aws s3 cp`
  - 各ディレクトリの `aws s3 sync`
  - `aws lambda update-function-code`
  - `aws cloudfront create-invalidation`

