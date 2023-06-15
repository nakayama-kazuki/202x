# CSP（Content Security Policy）Fetch ディレクティブの現実的な活用方法

こんにちは、プラットフォームエンジニア & 安全確保支援士の中山です。

Web サイトにはしばしば 3rd-party JavaScript … 例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載のための広告タグなど … を導入することがあります。一方で 3rd-party JavaScript には Web サイトを閲覧するユーザーに悪影響を与えてしまうリスクも存在するため、その導入とあわせたリスク対策も必要となります。

そこで、今回の記事では Content Security Policy（以降 CSP）Fetch ディレクティブを活用したリスク対策についてお伝えします。

## CSP Fetch ディレクティブとは

CSP Fetch ディレクティブについての詳細は [W3C 仕様](https://www.w3.org/TR/CSP3/) を確認頂くとして、その概念を絵にしたものがこちらです。端的には Web ブラウザに対し、サブリソースのロードやインライン JavaScript の実行に関する許可リスト（以降ソースリストと呼びます）を指示する方法のことです。

（★１：Fetch ディレクティブの説明）

具体例として Web サイトが "script-src + ホスト" を使って

> The script-src directive restricts the locations from which scripts may be executed. This includes not only URLs loaded directly into script elements, but also things like inline script blocks and XSLT stylesheets [XSLT] which can trigger script execution. 

以下のような指示を応答ヘッダとして送信した場合

```
Content-Security-Policy: script-src safe.example
```

Web ブラウザは safe.example からロードした JavaScript のみ実行を許可します。

```
<html>
<body>

<!-- NG : This can NOT be executed. -->
<script>
console.log('hello world');
</script>

<!-- OK : This can be loaded, then executed. -->
<script src='https://safe.example/safe.js'>
</script>

<!-- NG : This can NOT be loaded, then executed. -->
<script src='https://unsafe.example/unsafe.js'>
</script>

</body>
</html>
```

## 3rd-party JavaScript のリスクと対策

冒頭で述べた 3rd-party JavaScript のリスクとその対策について掘り下げてみましょう。

Web ブラウザの開発者ツールを使うことで Web サイトに導入されている 3rd-party JavaScript を確認することができます。

（★２：開発者ツール）

ヤフーでも多数の 3rd-party JavaScript が導入されていますが、もし 3rd-party JavaScript を提供する事業者に悪意があったり、仮に悪意はなくとも別な攻撃者によってホスト先の CDN やリポジトリ上の JavaScript コードが改変されていた場合、Web サイト内の情報 … ユーザーのアカウントに紐づく個人情報が含まれるかもしれません … が盗まれたり、ユーザーが [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) されてしまう、などのリスクが生じます。

（★３）

このようなリスクへの対策に Web ブラウザの Same Origin Policy（以下 SOP）という仕様を利用する方法があります。

1. ドメイン safe.example から text/html 文書「Ａ」をロードする
2. 文書「Ａ」内の iframe 要素経由で（safe.example とは別の）ドメイン unsafe.example の text/html 文書「Ｂ」をロードする
3. 文書「Ｂ」内で 3rd-party JavaScript をロードして実行する

こうすることで、文書「Ｂ」で実行される JavaScript は文書「Ａ」の DOM にアクセスできないため、万が一 3rd-party JavaScript を提供する事業者に悪意があったとしてもその影響範囲を iframe 内に限定することができます（加えて潜在的にリスクのある動作を制限したい場合、iframe 要素の sandbox 属性を活用することもご検討ください）。

（★４）

ところが、Web 解析ツールや広告のビューアビリティー計測など 3rd-party JavaScript がその目的を達成するために文書「Ａ」の DOM にアクセスする必要がある場合、SOP を利用した対策を採用することができません。信頼できる 3rd-party JavaScript に限り、このような場合に生じるリスクは受容することになります。

（★５）

現実はもう少し複雑で

- 3rd-party JavaScript の信頼性判断は容易ではない
- タグマネージャーを使ってアナリストやマーケティング担当が 3rd-party JavaScript を導入する場合がある
- ある事業者の 3rd-party JavaScript から別な … しばしば複数の … 事業者の 3rd-party JavaScript がロードされる場合がある

などの前提を置いて Web サイトを運営する必要があります。最後の「ある事業者の～」に関する補足として 2019 年の情報ですが、総務省の [オンライン広告におけるトラッキングの現状とその法的考察](https://www.soumu.go.jp/main_content/000599872.pdf) によれば

> タレントのコマーシャル起用で知られる大手スポーツジム運営会社の場合、2018 年 5 月の調査時点でサイト閲覧すると閲覧者のブラウザは 86 の広告会社や解析会社などにアクセスし、情報を送信することとなっていたが、執筆者がこのジム運営会社にたずねたところ、把握していたのは代理店 1 社に依頼した 6 事業者の 11 の JavaScript のみであり、残る 75 の情報送信先については気づいていなかった。

だそうです。怖いですね ^^;

（★６）

## CSP Fetch ディレクティブの現実的な活用方法

ソースリストベースでサブリソースのロードやインライン JavaScript の実行を制御したくとも、そもそもソースリストを用意～保守すること自体が難しかったり、シンプルに影響範囲を iframe 内に限定することができない場合にどうすればよいでしょうか？

そうしたケースもふまえ 3rd-party JavaScript のリスク対策について表にまとめてみましたのでご確認ください。

（★７：表）

### 高機密情報を扱う Web サイトの場合

セキュリティー重視の方法を採用します。加えて、ソースリストに nonce や hash も併用し、3rd-party JavaScript のリスクだけでなく、悪意あるインライン JavaScript の実行リスクにも対策されることをお勧めします。

具体例として Web サイトが "script-src + nonce" を使って、以下のような指示を応答ヘッダとして送信した場合

```
Content-Security-Policy: script-src 'nonce-ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'
```

Web ブラウザは同 nonce 属性を持つインライン JavaScript のみ実行を許可します。

```
<html>
<body>

<!-- OK : This can be executed. -->
<script nonce='ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'>
console.log('hello');
</script>

<!-- NG : This can NOT be executed. -->
<script>
console.log('world');
</script>

</body>
</html>
```

### 通常の Web サイトの場合

可用性とセキュリティーのバランスを考え、発見的統制手法を採用します。
ヤフーの場合、サービス毎に技術管掌担当がアサインされているので、各担当に定期的に 3rd-party JavaScript 実行レポートを確認してもらい潜在的なリスクを検知した場合には是正措置をとってもらいます。

インライン JavaScript の実行も制限すべき



## その他考察


★外部へのデータ送信の洗い出し
https://yj-yahoo-jp.slack.com/archives/CAN47E3PX/p1686553461058799?thread_ts=1685518256.005919&cid=CAN47E3PX

★Proxy とサンプリング
★TM での CSP 配信検討と
★nonce 面倒

ちなみに CSP の Fetch ディレクティブは meta 要素にも定義可能ですが

> NOTE: The Content-Security-Policy-Report-Only header is not supported inside a meta element.

との注釈があり一部の機能が利用できず、さらにその [背景に関する議論](https://github.com/w3c/webappsec-csp/issues/277) の中で

> I really wish we'd stop with meta-element based policies.

のような意見も出ているのでご注意を。

-----Original Message-----

★まとめとして（AI 先生に言われたような内容で）セキュリティー強化を



