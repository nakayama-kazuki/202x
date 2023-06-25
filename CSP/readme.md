# CSP を活用した 3rd-party JavaScript のリスク対策

こんにちは、プラットフォームエンジニアの中山です。

Web サイトにはしばしば 3rd-party JavaScript を導入することがあります。例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載や効果測定目的のコードスニペットなどは多くの Web サイトで導入されています。

その一方で 3rd-party JavaScript は Web サイトを閲覧するユーザーに対して悪影響を及ぼしかねないため、導入とあわせたリスク対策も必要となります。

そこで、今回は Content Security Policy（以降 CSP）を活用した 3rd-party JavaScript のリスク対策についてお伝えしたいと思います。なお CSP には複数のセキュリティ関連仕様が含まれますが、この記事では特に断りのない限り JavaScript のロードや実行を制御する [script-src ディレクティブ](https://www.w3.org/TR/CSP3/#directive-script-src) について述べているものとします。

## どのようなもの？

まずは概念を絵にしたものがこちらです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img01.png' />

Web ブラウザに対して JavaScript のロードや実行に関する許可リストを指示することで、悪意のある JavaScript が意図せずに実行されてしまうリスクを軽減することができます。

例えば Web サイトが以下のような指示を応答ヘッダとして送信した場合

```
Content-Security-Policy: script-src green.example orange.example
```

Web ブラウザは ***green.example*** および ***orange.example*** からのみ JavaScript のロードと実行を許可します。

```
<html>
<body>

<!-- OK -->
<script src='https://green.example/green.js'>
</script>

<!-- OK -->
<script src='https://orange.example/orange.js'>
</script>

<!-- NG -->
<script src='https://red.example/red.js'>
</script>

</body>
</html>
```

## 悩ましい現実

では、冒頭で述べた 3rd-party JavaScript のリスクとその対策について、もう少し掘り下げてみましょう。

Web ブラウザの開発者ツールを使うことで Web サイトに導入されている 3rd-party JavaScript を確認することができます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img02.png' />

ご覧の通り、ヤフーでも複数の 3rd-party JavaScript をロードしていることがわかります。

このとき、もし 3rd-party JavaScript を提供する事業者に悪意があったり、悪意はなくとも別な攻撃者によってホスト先の CDN やリポジトリ上の JavaScript コードが改変されていた場合、Web サイト内の情報、例えばユーザーのアカウントに紐づく個人情報が盗まれたり、ユーザーが [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) されてしまう、などのリスクが生じます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img03.png' />

このようなリスクに対しては、Web ブラウザの仕様である Same Origin Policy（以降 SOP）を活用した対策が有効です。

1. ドメイン ***safe.example*** から text/html 文書「Ａ」をロードする
2. 文書「Ａ」内の iframe 要素経由で（***safe.example*** とは別の）ドメイン ***unsafe.example*** の text/html 文書「Ｂ」をロードする
3. 文書「Ｂ」内で 3rd-party JavaScript をロードして実行する

こうすることで、もし 3rd-party JavaScript に悪意のあるコードが含まれていたとしても、その影響範囲を iframe 内に限定することができます。何故なら、文書「Ｂ」で実行される JavaScript は SOP によって文書「Ａ」の DOM にアクセスすることができないためです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img04.png' />

ところが、Web 解析ツールや広告のビューアビリティー計測など 3rd-party JavaScript がその目的を達成するために文書「Ａ」の DOM にアクセスする必要がある場合、SOP を活用した対策を採用することができません。そのような 3rd-party JavaScript については安全性を評価の上でリスク受容せざるをえませんが、それ以外の 3rd-party JavaScript のロードと実行が制限された状態さえ担保できれば概ねリスクは解消 … ですよね？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img05.png' />

いいえ、残念ながら現実はもう少し複雑です。多くの Web サイトは

- 3rd-party JavaScript の信頼性判断は容易ではない
- タグマネージャーを使ってマーケティング担当が（開発担当の与り知らない）3rd-party JavaScript を導入する場合がある
- ある事業者の 3rd-party JavaScript から別な … しばしば複数の … 事業者の 3rd-party JavaScript がロードされる場合がある

などの前提で運用しなければなりません。オーバーブロックが発生すれば必要十分なサービスを利用もしくは提供できず、取りこぼしが発生すれば潜在的なリスクの増加につながるため、CSP を活用したくとも適切な許可リストを用意するのは簡単なことではありません。

加えて箇条書きの最後の項目に関する補足ですが、総務省の学術雑誌 [オンライン広告におけるトラッキングの現状とその法的考察](https://www.soumu.go.jp/main_content/000599872.pdf) によれば

> タレントのコマーシャル起用で知られる大手スポーツジム運営会社の場合、2018 年 5 月の調査時点でサイト閲覧すると閲覧者のブラウザは 86 の広告会社や解析会社などにアクセスし、情報を送信することとなっていたが、執筆者がこのジム運営会社にたずねたところ、把握していたのは代理店 1 社に依頼した 6 事業者の 11 の JavaScript のみであり、残る 75 の情報送信先については気づいていなかった。

だそうです。怖いですね ^^;

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img06.png' />

## Web サイトに応じた方針

さて、悩ましい現実に立ち向かうべく、方針を表にまとめてみました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img07.png' />

まず最初に SOP を活用した対策、それが難しい場合には保険的対策 …

- 3rd-party JavaScript の安全性をレビューし、可能であれば自社 CDN から配信する
- 3rd-party JavaScript 提供事業者との契約で、問題発生時の対処方法を事前に取り決めておく
- 3rd-party JavaScript をタグマネージャー経由で導入し、有事の際にツール上で導入の一時停止を可能にする

などもご検討ください。

次いで No.4 → No.3 の順に掘り下げます。

### No.4 機密情報を扱う Web サイトに導入

機密情報を扱う Web サイトの場合、セキュリティ重視の方針を採用すべきです。原則として 3rd-party JavaScript の導入は控え、それに加え CSP を活用して 3rd-party JavaScript のロードと実行が制限された状態を担保しましょう。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example ...
```

ちなみに ***'strict-dynamic'*** は、明示的に許可した JavaScript からロードされる別な JavaScript についてもロードと実行を許可するための指定です。オーバーブロックを回避しやすくなる反面、潜在的なリスクの増加とならないよう、許可リストを用意する際にはご注意ください。

機密情報を扱う以上、3rd-party JavaScript のリスク対策に加えて XSS のリスクも最小化したいですよね。そこで ***nonce-source*** を併用し、明示的に許可していないインライン JavaScript の実行も制限しましょう。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example ... 'nonce-ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'
```

この場合 Web ブラウザは同 nonce 属性値を持つインライン JavaScript のみ実行を許可します。

```
<html>
<body>

<!-- OK -->
<script nonce='ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'>
console.log('Hello, world!');
</script>

<!-- NG -->
<script>
console.log('This may be injection code by XSS.');
</script>

</body>
</html>
```

### No.3 通常の Web サイトに導入

通常の Web サイトの場合、可用性とセキュリティのバランスをふまえ、レポート専用の CSP（以降 CSP-RO）を活用した発見的統制手法はいかがでしょうか。

> The Content-Security-Policy-Report-Only HTTP response header field allows web developers to experiment with policies by monitoring (but not enforcing) their effects. 

手法の趣旨からして全量データを必要とするものではないため、適切なサンプリング処理のもとで Web サイト内での 3rd-party JavaScript 実行レポートを作成し、定期的にその内容をチェックします。ヤフーの場合、サービス毎の技術管掌担当に定期的にレポートを確認してもらい、潜在的なリスクを検知した場合には是正措置を検討してもらうことにしています。

```
Content-Security-Policy-Report-Only: script-src 'strict-dynamic' safe.example ...
```

通常の Web サイトとはいえ XSS のリスクは最小化すべきですが、取り急ぎ 3rd-party JavaScript 実行レポートを確認したい場合は

> In either case, developers SHOULD NOT include either 'unsafe-inline', or data: as valid sources in their policies. Both enable XSS attacks by allowing code to be included directly in the document itself; they are best avoided completely.

を頭の片隅におきつつ ***'unsafe-inline'*** の暫定利用をご検討ください。

## 活用の幅を広げる

CSP や CSP-RO について、リスク対策以外への活用や運用改善提案（とその失敗）についてもご紹介します。

### 他の事業者に対する情報送信調査への活用

CSP-RO および Fetch ディレクティブ（script-src 以外も含め）を活用することで、Web サイト内でのサブリソースのロードに関するレポートを作成することができます。さらに、サブリソースのロード時のパラメータを確認することで、他の事業者に対して送信されている情報をチェックすることができます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/img08.png' />

総務省は Web サイトから第三者に対して送信される情報に対する透明性を高めるルールとして [外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html) を定めています。このルールに対応するための事前調査に CSO-RO を、意図せぬルール違反を回避するための手段として CSP を活用することができそうです。

### タグマネージャー経由の CSP 活用

以下のようなニーズに対し、都度サービス毎の担当者に応答ヘッダの修正を依頼をする場合 …

- サンプリングの割合を変更したい
- 運用を一時停止したい（+ 再開したい）
- 高機密情報を扱うか否かに応じて対応方法を変えたい etc ...

依頼される側としては計画やリソースの調整が発生し、依頼する側としてもガバナンスの維持が難しくなります。そこで、応答ヘッダではなくタグマネージャーを活用することで、CSP を活用した 3rd-party JavaScript のリスク対策を一元管理することはできないだろうか、と考えてみました。

Chrome 114.0.5735.134 を用いて

```
<meta http-equiv="Content-Security-Policy" content="script-src 'self'" />
```

のような meta 要素の動的な追加と、意図通りのふるまいを確認することができました。さらに ReportingObserver を用いてレポート内容を最適化したり、必要に応じてサンプリングする処理もタグマネージャーのコンテナ内に定義できるため悪くないアイデアに思えたのですが …

```
let ro = new ReportingObserver((in_reports, in_observer) => {
    for (let report of in_reports) {
        if (report.type !== 'csp-violation') {
            continue;
        }
        // sampling if needed
        if (Math.random() < 0.1) {
            let url = 'https://report-to.example/';
            navigator.sendBeacon(url, report.body.blockedURL);
        }
    }
});
ro.observe();
```

残念ながら

> NOTE: The Content-Security-Policy-Report-Only header is not supported inside a meta element.

とのことで CSP-RO を活用することができません。ですので、このアイデアは断念することになり、サービスを横断した依頼時の課題解消にはツールによる運用支援を検討中です。

ちなみにこの NOTE に関する [背景議論](https://github.com/w3c/webappsec-csp/issues/277) の中で

> I really wish we'd stop with meta-element based policies.

のような意見があり、仕様にも

> Authors are strongly encouraged to place meta elements as early in the document as possible, because policies in meta elements are not applied to content which precedes them. 

のような注意事項が記載されています。これらの点もふまえ meta 要素を経由した CSP 活用の是非についてご判断ください。

### まとめ

CSP 仕様の導入部分で

> This document defines Content Security Policy (CSP), a tool which developers can use to lock down their applications in various ways, mitigating the risk of content injection vulnerabilities such as cross-site scripting, and reducing the privilege with which their applications execute.

とありますが、今回 the risk of content injection 対策のみならず、Web サイトに応じた 3rd-party JavaScript のリスク対策や、さらには他の事業者に対する情報送信調査にも CSP を活用できることをお伝えできたかと思います。みなさまの Web サイトにおける CSP の活用のヒントになれば幸いです。

最後に、ヤフーではサービスの「安心と安全」を実現するための仲間を募集中です！われこそはという方のご連絡をお待ちしております。

