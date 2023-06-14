# CSP（Content Security Policy）Fetch ディレクティブの現実的な活用方法

こんにちは、プラットフォームエンジニア & 安全確保支援士の中山です。

Web サイトにはしばしば 3rd-party JavaScript … 例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載のための広告タグなど … を導入することがあります。一方で 3rd-party JavaScript には Web サイトを閲覧するユーザーに悪影響を与えてしまうリスクも存在するため、その導入とあわせたリスク対策も必要となります。

そこで、今回の記事では Content Security Policy（以降 CSP）Fetch ディレクティブを活用したリスク対策についてお伝えします。

## CSP Fetch ディレクティブとは

CSP Fetch ディレクティブについての詳細は [W3C 仕様](https://www.w3.org/TR/CSP3/) を確認頂くとして、その概念 … Web ブラウザに対してサブリソースのロードやインライン JavaScript の実行に関する許可リストを指示 … を絵にしたものがこちらです。

（★１：Fetch ディレクティブの説明）

具体例として ***script-src*** を使って

> The script-src directive restricts the locations from which scripts may be executed. This includes not only URLs loaded directly into script elements, but also things like inline script blocks and XSLT stylesheets [XSLT] which can trigger script execution. 

Web サイトが

```
Content-Security-Policy: script-src safe.example
```

のような指示を応答ヘッダとして送信した場合、Web ブラウザは ***safe.example*** からロードした JavaScript のみ実行を許可します。

```
<html>
<body>

<!-- x : This can NOT be executed. -->
<script>
console.log('hello world');
</script>

<!-- o : This can be loaded, then executed. -->
<script src='https://safe.example/safe.js'>
</script>

<!-- x : This can NOT be loaded, then executed. -->
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

1. ドメイン ***safe.example*** から text/html 文書「Ａ」をロードする
2. 文書「Ａ」内の iframe 要素経由で（***safe.example*** とは別の）ドメイン ***unsafe.example*** の text/html 文書「Ｂ」をロードする
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

許可リストベースでサブリソースのロードやインライン JavaScript の実行を制御しようにも、そもそも許可リストの用意や保守が難しかったり、シンプルに影響範囲を iframe 内に限定することができない場合にどうすればよいでしょうか？

3rd-party JavaScript のリスク対策について表にまとめてみましたのでご確認ください。

（★７：表）



★★サブタイトルをどこにつける
★★表はティアも含める？







（★７：インラインを抜く）

前提条件によって採用できる対策に違いがあり、また Web サイトの性質によっても採用すべき対策が変わってきます。

### 機密性の高い情報を扱う Web サイトの場合

基本的に 3rd-party JavaScript の導入は最小限にとどめ、
それでも導入が必要な場合にはリスクを最小化する方法を選択してください。
3rd-party JavaScript については 1-1 ＞ 1-1 と 1-4 の使い分け ＞ 1-4 をお勧めします

ところで、表中の「悪意あるインライン JavaScript の実行」に関する補足ですが、仕様には XSS 等のリスクを緩和する手法だと述べられています。

> This document defines Content Security Policy (CSP), a tool which developers can use to lock down their applications in various ways, mitigating the risk of content injection vulnerabilities such as cross-site scripting, and reducing the privilege with which their applications execute.

### 一般的な Web サイトの場合

可用性とセキュリティーのバランスを考えます。

3rd-party JavaScript については 1-3
1 ＞ 1-1 と 1-4 の使い分け ＞ 1-4 をお勧めします
インライン JavaScript については 2 の実装をお勧めします

★定期的にレポートを出しサービスの技術管掌担当にチェックしてもらう

### 上述の対策が難しい場合

a. 3rd-party 計測タグ（javascript）を YTM 経由で配信することで安全性を担保する
    ※ 実際には安全性には寄与しないが、異常検知時にはすぐに停止できるというメリットはある
b. iframe で yahoo.co.jp からオリジンを分離したうえで 3rd-party 計測タグを設置する
    ※ これがガイドラインの HOW だが、合目的ではないケースがある（オリジン分離でタグの機能が使えないなど）
c. 3rd-party の CDN からではなく、安全性のレビュー実施後にヤフーの CDN から配信する
    ※ 原さんの 3 に相当する。これはツール側の保守に追従できずに難しい場合が多い
d. 3rd-party 計測タグ（javascript）とあわせて CSP 機能で悪意ある piggy-back を監視する
    ※ 完璧ではないが、盗む系のリスクなど、いくつかのリスクに発見的統制を効かせられる
e. 3rd-party と契約でヤフーやユーザーに被害があった場合の契約を結ぶ
    ※ DV, MOAT, IAS はこれですよね

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



