# CSP（Content Security Policy）Fetch ディレクティブ活用の現実解

こんにちは、プラットフォームエンジニア & 安全確保支援士の中山です。

Web サイトにはしばしば 3rd-party JavaScript … 例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載のための広告タグなど … を導入することがあります。

一方で 3rd-party JavaScript には Web サイトを閲覧するユーザーに悪影響を与えるリスクも存在するため、その導入とあわせてリスク対策も必要となります。

そこで、今回の記事では Content Security Policy（以降 CSP）の Fetch ディレクティブを活用したリスク対策の取り組みについてお伝えします。

CSP の Fetch ディレクティブについての詳細は [W3C 仕様](https://www.w3.org/TR/CSP3/) を確認頂くとして、その概念 … Web ブラウザに対してサブリソースの読み込みやインライン JavaScript の実行に関する許可リストを指示 … を絵にしたものがこちらです。

（★１：Fetch ディレクティブの説明）

例えば ***script-src*** …

> The script-src directive restricts the locations from which scripts may be executed. This includes not only URLs loaded directly into script elements, but also things like inline script blocks and XSLT stylesheets [XSLT] which can trigger script execution. 

を使って Web サイトが

```
Content-Security-Policy: script-src http://allowed.example/
```

のような指示を応答ヘッダとして送信した場合、Web ブラウザは ***allowed.example*** から読み込んだ JavaScript のみ実行を許可します。

では、もう少し 3rd-party JavaScript のリスクと対策について掘り下げてみましょう。

Web ブラウザの開発者ツールを使うことで Web サイトに導入されている 3rd-party JavaScript を確認することができます。

（★２：開発者ツール）

このとき、もし 3rd-party JavaScript を提供する事業者に悪意があったり、仮に悪意はなくとも別な攻撃者によってホスト先の CDN やリポジトリ上の JavaScript コードが改変されていた場合、Web サイト内の情報 … ユーザーのアカウントに紐づく個人情報が含まれるかもしれません … が盗まれたり、閲覧中のユーザーが [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) される、といったリスクが生じます。

（★３）

上記リスクへの対策に Web ブラウザの Same Origin Policy（以下 SOP）という仕様を利用する方法があります。

1. ドメイン ***safe.exampl***e から text/html 文書「Ａ」を読み込む
2. 文書「Ａ」内の iframe 要素経由でドメイン ***unsafe.example*** の text/html 文書「Ｂ」を読み込む
3. 文書「Ｂ」内で 3rd-party JavaScript を読み込んで実行する

文書「Ｂ」で実行される JavaScript は文書「Ａ」の DOM にアクセスできないため、万が一 3rd-party JavaScript を提供する事業者に悪意があったとしてもその影響範囲を iframe 内に限定することができます。

（★４）

他方、Web 解析ツールや広告のビューアビリティー計測など 3rd-party JavaScript がその目的を達成するために文書「Ａ」の DOM にアクセスする必要がある場合、SOP を利用した対策は採用できません。

なので、信頼できる 3rd-party JavaScript については一定のリスクは受容せざるを得ないでしょう。

（★５）

現実はもう少し複雑で、

- 3rd-party JavaScript の信頼性の判断は容易ではない
- タグマネージャーを使ってアナリストやマーケティング担当が 3rd-party JavaScript を導入する場合がある
- ある事業者の 3rd-party JavaScript から別な … しばしば複数の … 事業者の 3rd-party JavaScript が読み込まれる場合がある

などの前提を置いて Web サイトを運営する必要があります。

2019 年の情報ですが、総務省の [オンライン広告におけるトラッキングの現状とその法的考察](https://www.soumu.go.jp/main_content/000599872.pdf) によれば

> タレントのコマーシャル起用で知られる大手スポーツジム運営会社の場合、2018 年 5 月の調査時点でサイト閲覧すると閲覧者のブラウザは 86 の広告会社や解析会社などにアクセスし、情報を送信することとなっていたが、執筆者がこのジム運営会社にたずねたところ、把握していたのは代理店 1 社に依頼した 6 事業者の 11 の JavaScript のみであり、残る 75 の情報送信先については気づいていなかった。

だそうです。怖いですね ^^;

（★６）

ここで 3rd-party JavaScript のリスク対策として CSP の Fetch ディレクティブの出番となります。








-----Original Message-----

ちなみに CSP の Fetch ディレクティブは meta 要素にも定義可能ですが

> NOTE: The Content-Security-Policy-Report-Only header is not supported inside a meta element.

との注釈があり一部の機能が利用できず、さらにその [背景に関する議論](https://github.com/w3c/webappsec-csp/issues/277) の中で

> I really wish we'd stop with meta-element based policies.

のような意見も出ているのでご注意を。

-----Original Message-----


## 現実解の模索

★ティアを分けた対応（ブロック + サンプリングレポートと発見的統制 + 受容）
★イシューととりうる HOW のマトリクス


ゼロリスク = 違反時の停止
	インライン
		とめたいなら nonce
		受容するなら 'unsafe-inline'
	3rd-party JavaScript からの piggyback
		読み込むサブリソースを全てホワイトリスト登録。ただし 3p スクリプトが動作不全
		チェックしないなら strict-dynamic でいい
発見的統制 = 違反時のレポート
	インライン
		レポートしたいなら nonce★XSS のケースのレポートを見てみる
		受容するなら 'unsafe-inline'
	3rd-party JavaScript からの piggyback
		自ドメイン以外をレポートで発見的統制

★これ AI にも聞いてみる

## メディアでのティア 2 実験と今後の運用

★TBD
★定期的にレポートを出しサービスの技術管掌担当にチェックしてもらう

## その他考察

★Proxy とサンプリング
★TM での CSP 配信検討と
★nonce 面倒
★まとめとして（AI 先生に言われたような内容で）セキュリティー強化を



