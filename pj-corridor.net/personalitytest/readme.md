# そんな時どうする生成 AI 連携アプリ開発

こんにちは、エンジニアの中山です。この記事では生成 AI 連携アプリ（パーソナリティ診断アプリ）の開発を通じて直面した課題、例えばアビューズ対策やプロンプトチューニングにおける試行錯誤とトレードオフへの向き合い方についてご紹介させていただきます。なお、以前シナジーマーケティングでご一緒させて頂いたこともあり、TECHSCORE BLOG への記事掲載についてご快諾いただきました ^^ どうもありがとうございます。

最初に開発した診断アプリをお試しください。煩わしい広告（笑）はウインドウ幅を調整すれば消せます。

- <a href='https://pj-corridor.net/personalitytest/OpenCAPS.html'>CAPS（= Controller, Analyzer, Promoter, Supporter）診断</a>
- <a href='https://pj-corridor.net/personalitytest/OpenDiSC.html'>DiSC（= Drive, Influence, Steadiness, Compliance）診断</a>

CAPS や DiSC は流行の MBTI と同様、いわゆる疑似科学的なパーソナリティ診断です。意思決定の根拠にはできませんが、例えばワークショップ参加者が診断結果を共有することで、自己紹介や会話のハードルを下げ場の雰囲気を温めることができます。是非そうした機会での活用をご検討ください。

ちなみにこちらは私の診断結果です。

★（スクリーンキャプチャ）★

記事の主題の通り、診断結果は生成 AI の出力を含むため、高い表現力を得る一方で品質のリスクも伴います。とはいえ、品質担保にかけるコストは趣味プログラミングの範囲に抑えなければなりません。そこで、ルールベースの採点ロジックは deterministic に保ち、生成 AI の出力は説明文のみとすることでハルシネーションの影響範囲をコントロールしています。

それでは、ここからは具体的な試行錯誤やトレードオフへの向き合い方について 3 つの章に分けてご紹介します。

## 1. アビューズ対策編

診断アプリは匿名でアクセスできますが、バックエンドには課金の発生する生成 AI（Amazon Bedrock）を利用しています。そのため、ボットによるアビューズで爆死、というのは想定しうる事態です。とはいえ、攻撃側のインセンティブも考慮し「高度なアビューズは受容し、それ以外は遮断」の方針とし、以下のアビューズ対策を実装しました。

### 1.1. WAF による一般的な攻撃トラフィックの遮断

WAF については AWS 標準の保護パックを参考にしつつ

- `GeoRule`（攻撃が多い国の IP 遮断）の採用
- `GlobalRateBasedRule`（リクエストの上限）を調整
- `RateBasedRulePOST`（POST / PUT / DELETE の上限）を調整
- `AWS-AWSManagedRulesAmazonIpReputationList`（AWS 認定攻撃 IP 遮断）の採用
- `AWS-AWSManagedRulesAnonymousIpList`（トンネリング等身元隠蔽 IP 遮断）の採用

を残し、今回の診断アプリに不要な他のルールは削除しました。懸念事項として Lambda Function URL を公開エンドポイントとして利用する場合、CloudFront を経由しないリクエストが WAF をバイパスできてしまいます。CloudFront 経由（つまりは WAF も経由）であることを担保する方法はいくつかありますが、

- Lambda Function URL を private 化し CloudFront OAC を利用する場合、クライアント側での `x-amz-content-sha256` ヘッダサポートが必要になる
- CloudFront で拡張ヘッダに秘密情報を付与し、それを Lambda 側で検証する場合、サーバ側での突合処理や環境変数の管理が必要になる

のように悩ましい状況です。当初は <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/spot-private-lambda.yml'>Lambda Function URL の private 化</a> を検討していたものの、診断アプリの環境依存を最小化するために今回は対応を見送ることにしました。

ところで、保護パックに限らず AWS コンソールで設定した内容は忘れがちですよね。私の場合は、暫定的な設定を戻し忘れるトラブルもありました。そのような状況に備えてマネージドサービスの設定をリポジトリで管理することをお勧めします。

例えば WAF の保護パックの場合 …

1. <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/WAFPolicyApiCorridor.json'>JSON コード</a> を Source of Truth としてリポジトリで管理
2. 保護パックの変更は常に以下の手順
  1. 最初に Source of Truth を変更
  2. AWS コンソールで Source of Truth の JSON をペーストしエラーチェック
3. CI で Source of Truth と WAF 適用中の保護パックの <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml#L49'>整合性チェック</a>

のような管理が考えられます。

### 1.2. 雑なボットや診断フローを経由しないブラウザのアクセス制御

アクセス制御については、

1. 診断アプリアクセス時に秘密の情報 + 時刻情報から生成したトークンを `Set-Cookie`
2. 診断クエリは `credentials : 'include'` でトークンを送信しサーバ側で検証
  - 人間が回答に要する妥当な時間をウインドウとして定義し、それを逸脱したリクエストは、ボットによる自動送信やセッション放置とみなして遮断

のように実装しました。あわせて別レイヤーの対策も併用しました。

- `SameSite=Strict` として別ドメインからの POST クエリを遮断（<a href='https://blog.techscore.com/entry/2023/10/06/110100'>参考</a>）
- 許可リストにあるオリジンのみを `Access-Control-Allow-Origin` に指定

ボットを高度化すればこれらの対策を迂回することは可能ですが、方針にもとづいてまずはここまでの対策で運用～モニタリングしつつ、必要に応じて追加の対策を検討することにします。

蛇足ですが、アビューズ対策には後日談があります。運用してわかったことですが、コストについては WAF が Bedrock よりもだいぶ大きくなってしまいました。なので次のステップとしては WAF の利用を中止し、POST 回数の制限やキャッシュを DynamoDB で実装することを検討しています。マネージドサービスが常に最適解、というわけでもなさそうですね。

## 2. 技術選定編

技術選定では Lambda と API Gateway について悩みました。Lambda の選択肢は

1. Lambda 独自コンテナ方式（PHP 利用）
2. Lambda zip 方式（Python / Node 利用）

でしたが、もともとローカルに PHP のテスト環境を構築済みだったこともあり、すぐに着手できそうな 1. に心が動きました。しかし Lambda との親和性や CI の複雑化の懸念もあり、最終的に Python + zip 方式を採用することにしました。加えて、後で楽をするたに

- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template.py'>テスト環境 / Lambda 環境共通テンプレート</a>
- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat'>環境再現 + Python 再起動バッチ</a>

のような仕組化により、後述するプロンプトチューニングの Try & Error 基盤としました。蛇足ですが AWS 環境で試行錯誤し、Lambda Function を繰り返し作成していると、その都度新しい IAM Role が自動生成されます。不要になった IAM Role は、忘れないうちに削除しておきましょう。

次に API Gateway については

1. JavaScript@Browser → CloudFront + WAF → Python@Lambda → Bedrock
2. JavaScript@Browser → CloudFront + WAF → API Gateway → Python@Lambda → Bedrock

の何れの構成を選ぶべきかで悩みましたが、

|API Gateway の提供機能|診断アプリの実装|
|---|---|
|認証|Python@Lambda でアクセス制御実装|
|レート制御|WAF が対応 ※ 将来変更予定|
|ルーティング|Python@Lambda でエントリーポイント管理|

のような状況なので、今回は導入を見送り将来機能拡張することがあれば再検討することにしました。

## 3. アプリケーション開発編

アビューズ対策の方針が決まり、技術選定も終えたのでいよいよアプリケーション開発です。完成したら世界中の人に試してもらえるように Reddit に投稿してみましょう。そうなると、英語だけでなくユーザーの母国語もサポートしたいですね。そんなモチベーションから <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenAssessmentLib.js#L18'>i18n の仕組</a> を実装し 9 カ国語に対応しました。

```
const GREETING = i18n.text({
    en : 'Hello',
    ja : 'こんにちは',
    fr : 'Bonjour',
    de : 'Hallo',
    es : 'Hola',
    pt : 'Olá',
    hi : 'नमस्ते',
    ko : '안녕하세요',
    zh : '你好'
})
```

さらに生成 AI の出力をできるだけ安定させるために、

- ユーザーへの質問は母国語
- 診断クエリとして生成 AI に送信するテキストは常に英語
- 生成 AI の出力は母国語

のような I/F 設計としました。

★（スクリーンキャプチャ）★

また、状態管理や UI 部品および Lambda との I/F の実装を DiSC と CAPS で共通化し、将来 MBTI などの診断アプリを開発する場合にも同じフレームワークを活用できるようにしました。

最後にいよいよ生成 AI の出力品質の向上と安定化、具体的にはプロンプトチューニングにに取り掛かります。ここは焦らず「急がば回れ」で、チューニングのための Try & Error 基盤を用意することが最善策です。技術選定編で述べた仕組化にあわせて

1. プロンプト生成のためのショートカット機能を用意しておく
  - 診断アプリの場合、設問回答には時間がかかるためランダムな自動回答 + 診断クエリ実行の仕組
  - ただし、これがアビューズリスクを生まないようにショートカット用の秘密情報は <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenCAPS.html#L2054'>ハッシュで検証</a>
2. テスト環境（生成 AI 接続なし）でのチューニング
  1. テスト環境では診断結果ではなくその手前のプロンプト（= テンプレートに質問回答を合成した結果）を出力する機能を用意しておく
  2. ショートカット機能でプロンプトを出力する
  3. プロンプトを普段使いの Gemini や ChatGPT に入力し及第点の診断結果が得られるまでチューニングを行う
    - Gemini や ChatGPT にはプロンプトの内容についてのフィードバックももらいチューニングの参考にする
3. 本番環境（生成 AI 接続あり）でのチューニング
  1. 本番のモデルに合わせたチューニング
  2. 最終的に診断アプリを通しで実行して違和感確認

のようにチューニングを進めました。なお Gemini や ChatGPT のアドバイスに従うと、プロンプトが時間とともに肥大化してゆく傾向があります。適宜指示の統廃合や文書構造のリファクタリングにも取り組むことをお勧めします。

## おわりに

ここまで読んでいただきどうもありがとうございます。今回の診断アプリはハルシネーションの影響範囲をコントロールしているため、プロンプトチューニング（… を楽にするため）の仕組化に留まりましたが、生成 AI の出力品質チェックの自動化も工夫の余地が大きい領域だと思います。

- ルールベースで出力形式やキーワード（含むべき、含んではいけない）のチェック
- 評価軸を与えた生成 AI によるジャッジで内容を採点

などは今後の開発では試してみたいですね。

私の試行錯誤やトレードオフへの向き合い方が皆さまにとって有益な情報になれば幸いです。
