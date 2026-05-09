# そんな時どうする生成 AI 連携アプリ開発

こんにちは、エンジニアの中山です。この記事では生成 AI 連携アプリの開発を通じて直面した課題、例えばアビューズ対策やプロンプトチューニングにおける試行錯誤とトレードオフへの向き合い方についてご紹介させていただきます。なお、以前シナジーマーケティングでご一緒させて頂いたこともあり、TECHSCORE BLOG への記事掲載についてご快諾いただきました 😊 どうもありがとうございます。

最初に開発したパーソナリティ診断アプリをお試しください。煩わしい広告 😆 はウインドウ幅を調整すれば消せます。

- <a href='https://pj-corridor.net/personalitytest/OpenCAPS.html'>CAPS（= Controller, Analyzer, Promoter, Supporter）診断</a>
- <a href='https://pj-corridor.net/personalitytest/OpenDiSC.html'>DiSC（= Drive, Influence, Steadiness, Compliance）診断</a>

CAPS や DiSC は巷で流行の MBTI と同様、いわゆる疑似科学的なパーソナリティ診断です。意思決定の根拠にはできませんが、例えばワークショップ参加者が診断結果を共有することで、自己紹介セッションを盛り上げて場の雰囲気を温めることができます。そのような機会には是非診断アプリを使ってみてください。

ちなみにこちらは私の CAPS 診断結果です。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/pj-corridor.net/personalitytest/blog/sample.png' />

アドバイスと取り扱い説明書は生成 AI による出力ですが、日本語の文章中に現れる「Respondent」という主語に唐突感がありますね。このように生成 AI 連携アプリは高い表現力を得る一方で品質面のリスクが生じます。とはいえ、品質担保にかけるコストは趣味プログラミングの範囲に抑えたいところです。そこで、ルールベースの採点ロジックは deterministic に保ち、生成 AI の出力は補足的な文章に留めることでハルシネーションの影響範囲をコントロールしました。

それでは、ここから具体的な試行錯誤やトレードオフへの向き合い方について 3 つの章に分けてご紹介します。

## 1. アビューズ対策編

診断アプリは匿名でアクセスできますが、バックエンドには課金の発生する生成 AI（Amazon Bedrock）を利用しています。そのため、ボットによるアビューズで爆死、というのは想定しうるシナリオです。とはいえ全ての脅威を排除するのではなく、攻撃側のインセンティブも考慮して「顕在化リスクの小さい脅威は受容し、大きな脅威に対策」を基本方針としました。

### 1.1. WAF による一般的な攻撃トラフィックの遮断

WAF については AWS 標準の保護パックを参考にしつつ

- `GeoRule`（攻撃が多い地域の IP 遮断）
- `AWS-AWSManagedRulesAmazonIpReputationList`（AWS 認定攻撃 IP 遮断）
- `AWS-AWSManagedRulesAnonymousIpList`（トンネリング等身元隠蔽 IP 遮断）
- 診断アプリ用に調整した `GlobalRateBasedRule`（リクエストの上限設定）
- 診断アプリ用に調整した `RateBasedRulePOST`（POST / PUT / DELETE の上限設定）

を採用し、`AWS-AWSManagedRulesSQLiRuleSet` など診断アプリに必要のないルールは削除しました。ただ、Lambda 関数 URL を公開エンドポイントとして利用する場合、CloudFront を経由しないリクエストが WAF をバイパスできてしまうことが懸念事項です。CloudFront 経由（= WAF 経由）であることを担保する方法もありますが、

- Lambda 関数 URL の `AuthType` を `AWS_IAM` に変更し CloudFront OAC を利用<br />👉 この場合、POST リクエスト時の `x-amz-content-sha256` サポートが必要になる
- CloudFront で拡張ヘッダに秘密情報を付与し、それを Lambda 側で検証<br />👉 この場合、複数の環境変数の管理や突合処理が必要になる

のように環境に依存した実装が必要になります。悪意ある第三者が Lambda 関数 URL を知り WAF を迂回するリスクを勘案し、今回の対応は見送りとしました。

余談ですが、保護パックに限らず AWS コンソールで設定した内容は忘れがちですよね。暫定的な設定を戻し忘れるとトラブルの原因にもなります。そのような状況に備え、マネージドサービスの設定はリポジトリでの管理（IaC の手前くらい）をお勧めします。

例えば WAF の保護パックの場合 …

1. 保護パックの <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/WAFPolicyApiCorridor.json'>JSON</a> を Source of Truth としてリポジトリで管理
2. 保護パックの変更は常に Source of Truth → AWS コンソールからの設定、の手順で実施
3. Source of Truth と WAF 適用中の保護パックを <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml#L49'> CI で整合性確認</a>

のような管理が考えられます。

ところで WAF には後日談がありまして、診断アプリのトラフィック規模ですと、WAF の固定費が Bedrock の従量課金額を上回ってしまいました。見積もりをしないとこうなる、という身を挺した 😅 教訓ですね。今後については、トラフィックが伸びるまでは WAF の利用を中断し、コストに影響する POST 回数の制限を DynamoDB で実装することも検討しています。

### 1.2. 雑なボットや診断フローを経由しないブラウザのアクセス制御

アクセス制御については、

1. 診断アプリアクセス時に「秘密の情報 + 時刻情報」から生成したトークンを `Set-Cookie` でブラウザに送信
2. ブラウザ は診断クエリ時の `fetch` に `credentials : 'include'` を指定しトークンをサーバに送信
3. サーバは人間の回答時間の範囲で生成され得るトークンならば正常なクエリと判断

のような実装に加え、以下の対策も併用しました。

- `SameSite=Strict` として別ドメインからの POST 時の Cookie を遮断（<a href='https://blog.techscore.com/entry/2023/10/06/110100'>図解 SameSite@Set-Cookie</a> もご参考まで）
- 許可リストにあるオリジンのみを `Access-Control-Allow-Origin` に指定しブラウザ経由のレスポンス参照を制限

ボットを高度化すればこれらの対策は迂回できますが、初手は基本方針の範囲にとどめ、アクセス状況をモニタリングしつつ、追加の対策を検討することにします。

## 2. 技術選定編

ここでは Lambda と API Gateway に関する試行錯誤についてご紹介します。

診断アプリの実行環境として Lambda は合理的な選択肢でしたが

1. Lambda 独自コンテナ方式（PHP 利用）
2. Lambda zip 方式（Python / Node 利用）

については、当初 1 に心が動きました。もともとローカルに PHP のテスト環境を構築済みだったので、アジャイルな開発～テストに取り組めると考えていたからです。しかし Lambda との親和性や CI の複雑化の懸念もふまえ、結果として 2 を採用することにしました。振り返ってみれば、AWS 環境での試行錯誤やブラックボックスを紐解く時間の方が相対的に長かったため、的を射た選択だったかと思います。

試行錯誤といえば、AWS コンソールから Lambda 関数の作成を繰り返すと、その都度新しい IAM Role が自動生成されます。その残骸に限らず、使わないリソースを放置すると将来の技術負債となるため、忘れないうちに削除しておきましょう。

実行環境の準備はできましたが、ここでアプリケーション開発に進みたい気持ちをぐっとこらえ、後で楽をするために Lambda 環境とテスト環境を透過的に扱うための仕組を用意します。

- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template.py'>環境共通 Python テンプレート</a>
- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat'>テスト環境ランチャー</a>

これは、後述するプロンプトチューニングの足場となります。

次に API Gateway を中継する構成をとるべきか否かの判断ですが、

|提供機能|診断アプリの実装|
|---|---|
|認証|独自アクセス制御|
|ルーティング|Lambda 内で完結するルーティング|
|スロットリング|WAF が対応（今後変更予定）|

のような状況から、現段階ではコストがメリットを上回るため API Gateway へのオフロードは見送ることにしました。

## 3. アプリケーション開発編

アビューズ対策が定まり、技術選定も終えたならいよいよアプリケーション開発です。完成したら世界中のユーザーに試してもらえるように Reddit に投稿したいですね。そうなると、ユーザーの母国語で UI を提供したくなります。そんなモチベーションから 9 カ国語をサポートするために <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenAssessmentLib.js#L18'>簡易 i18n クラス</a> を実装しました。

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

さらに生成 AI の出力品質を安定させるために、ユーザーとの I/F は母国語としつつ生成 AI への入力は英語に固定しました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/pj-corridor.net/personalitytest/blog/arch.png' width='600' />

また、状態管理や UI 部品および Lambda やテスト環境との I/F の実装は DiSC と CAPS で <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenAssessmentLib.js'>共通化</a> し、将来 MBTI などの診断アプリを開発する際にも同じフレームワークを活用できるようにします。

さて、アプリケーション開発もいよいよ大詰めです。最後に生成 AI の出力品質の向上と安定化、具体的にはプロンプトチューニングに取り掛かりましょう。ここは焦らず「急がば回れ」で、まずは試行錯誤のための基盤を整えます。技術選定編でご紹介した足場に加えて

1. 予めプロンプト生成のためのショートカット機能を用意しておく
	- 診断アプリの場合「ランダムな回答 + 診断クエリ実行」の自動化
		- ショートカット起動の秘密情報は <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenCAPS.html#L2069'>ハッシュで検証</a> する形でアビューズ対策
2. テスト環境（生成 AI 接続なし）でのチューニング
	1. ショートカット機能を実行
	2. テスト環境ではプロンプト（= テンプレートに設問回答を合成した結果）をコンソール出力
	3. 普段使いの Gemini や ChatGPT で本番をシミュレートし、出力を評価
	4. 及第点の出力が得られなければテンプレートや合成方法をチューニングして評価を繰り返す
		- 適宜 Gemini や ChatGPT からプロンプト内容についてのフィードバックを受け、チューニングの参考にする
3. 本番環境（生成 AI 接続あり）でのチューニング
	1. まずはショートカット機能を用いてデグレ部分チューニング
	2. 診断アプリを通しで実行し、出力内容の違和感などを最終チェック

のようにチューニングを進めました。診断アプリのように多言語をサポートしている場合、本番環境では全ての言語で生成 AI 出力を確認してみましょう。私の場合、この確認で `hi` `ko` `zh` の出力に問題が生じることを検知できました。同じ内容の文章生成であっても、言語によっては必要なトークン数が数倍になる、というのはこのときの学びです。

入力についても、Gemini や ChatGPT のアドバイスは保険的な指示の追加でプロンプトを肥大化させる傾向があるので、適宜指示の統廃合や、構造のリファクタリングに取り組むことをお勧めします。

最後に冒頭の「Respondent」に関する伏線回収です。ここは文法上の主語を同僚や友人としつつ、取り扱い説明書の対象を「回答者」に固定する必要がありました。しかし

```
The second response must be written for the Respondent's colleagues or friends.
The grammatical subject must be the colleagues or friends, and when referring to the Respondent,
consistently use the {{lang}} term for "Respondent".
```

と指示した場合、文法上の主語が「あなた」になってしまいます。そこで代名詞の利用禁止の指示を加えると、今度は「Respondent」になってしまいます 🤔。これは、学習データに基づく自然な表現の生成と、主語や参照語に関する指示が競合していることが原因で、最終的に出力を安定させるために

```
The second response must be written for the Respondent's colleagues or friends.
The grammatical subject must be the colleagues or friends, and when referring to the Respondent,
always use the fixed keyword "_RESPONDENT_" without any modification, translation, or suffixes.
```

のように `_RESPONDENT_` と固定した上でクライアント側で置換、という力技 😅 に落ち着きました。

```
const RESPONDENT = i18n.text({
    en : 'Respondent',
    ja : '回答者',
    fr : 'Répondant',
    de : 'Befragter',
    es : 'Encuestado',
    pt : 'Respondente',
    hi : 'उत्तरदाता',
    ko : '응답자',
    zh : '受访者'
});
```

## おわりに

ここまで読んでいただきどうもありがとうございます。今回の診断アプリではハルシネーションの影響範囲をコントロールしていることを前提に、プロンプトチューニングの仕組化にフォーカスしましたが、生成 AI の出力品質チェックの自動化

- ルールベースで出力形式やキーワード（含むべき、含めるべきでない）のチェック
- 生成 AI 甲の出力と評価軸を生成 AI 乙に入力して定性評価

などは今後の開発で試してみたいと思ってます。

というわけで、私の試行錯誤やトレードオフへの向き合い方が皆さまにとって有益な情報になれば幸いです。
