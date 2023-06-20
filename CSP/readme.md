# CSP を活用した 3rd-party JavaScript のリスク対策

こんにちは、プラットフォームエンジニアの中山です。

Web サイトにはしばしば 3rd-party JavaScript を導入することがあります。例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載や効果測定目的のコードスニペットなどは多くの Web サイトで導入されています。

その一方で 3rd-party JavaScript には Web サイトを閲覧するユーザーに対して悪影響を与えるリスクも存在するため、その導入とあわせたリスク対策も必要となります。

そこで、今回は Content Security Policy（以降 CSP と略します）を活用した 3rd-party JavaScript のリスク対策についてお伝えしたいと思います。なお CSP には複数のセキュリティ関連仕様が含まれますが、この記事内ではサブリソースのロードや JavaScript の実行を制御する [Fetch ディレクティブ](https://www.w3.org/TR/CSP3/#directives-fetch) のことを指して CSP と呼ぶことにします。

## CSP とは

まずは概念を絵にしたものがこちらです。

（★１：Fetch ディレクティブの説明）

Web ブラウザに対して、サブリソースのロードや JavaScript の実行に関する許可リストを指示することで、意図しない外部へのデータ送信や、悪意のある JavaScript の実行リスクなどを軽減することができます。

例えば Web サイトが以下のような指示を応答ヘッダとして送信した場合

```
Content-Security-Policy: script-src safe.example
```

Web ブラウザは ***safe.example*** からロードした JavaScript のみ実行を許可します。

```
<html>
<body>

<!-- OK -->
<script src='https://safe.example/safe.js'>
</script>

<!-- NG -->
<script src='https://unsafe.example/unsafe.js'>
</script>

<!-- NG -->
<script>
console.log('Hello, world!');
</script>

</body>
</html>
```

## 悩ましい現実

では、冒頭で述べた 3rd-party JavaScript のリスクとその対策について、もう少し掘り下げてみましょう。

Web ブラウザの開発者ツールを使うことで Web サイトに導入されている 3rd-party JavaScript を確認することができます。

（★２：開発者ツール）

ご覧の通り、ヤフーでも複数の 3rd-party JavaScript をロードしています。

このとき、もし 3rd-party JavaScript を提供する事業者に悪意があったり、悪意はなくとも別な攻撃者によってホスト先の CDN やリポジトリ上の JavaScript コードが改変されていた場合、Web サイト内の情報 … 例えばユーザーのアカウントに紐づく個人情報が盗まれたり、ユーザーが [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) されてしまう、などのリスクが生じます。

（★３）

このようなリスクに対しては、Web ブラウザの仕様である Same Origin Policy（以降 SOP と略します）を活用した対策が有効です。

1. ドメイン ***safe.example*** から text/html 文書「Ａ」をロードする
2. 文書「Ａ」内の iframe 要素経由で（***safe.example*** とは別の）ドメイン ***unsafe.example*** の text/html 文書「Ｂ」をロードする
3. 文書「Ｂ」内で 3rd-party JavaScript をロードして実行する

こうすることで、もし 3rd-party JavaScript を提供する事業者に悪意があったとしても、その影響範囲を iframe 内に限定することができます。何故なら、文書「Ｂ」で実行される JavaScript は SOP によって文書「Ａ」の DOM にアクセスすることができないためです。

（★４）

ところが、Web 解析ツールや広告のビューアビリティー計測など 3rd-party JavaScript がその目的を達成するために文書「Ａ」の DOM にアクセスする必要がある場合、この対策を採用することができません。そのような 3rd-party JavaScript についてはリスク受容（信頼できることを前提に）せざるをえませんが、それ以外の 3rd-party JavaScript については CSP を活用してロードと実行が制限された状態を保証する、というのが現実的でしょうか。

（★５）

★★★


しかしながら現実はもう少し悩ましく、なぜなら多くの Web サイトは

- 3rd-party JavaScript の信頼性判断は容易ではない
- タグマネージャーを使ってマーケティング担当が（開発担当の与り知らない）3rd-party JavaScript を導入する場合がある
- ある事業者の 3rd-party JavaScript から別な … しばしば複数の … 事業者の 3rd-party JavaScript がロードされる場合がある

などの前提のもとで運用する必要があるためです。こうなると ******source-list***★★*** に基づいて 3rd-party JavaScript のロードや実行を制限しようにも、その ******source-list***★★*** を用意すること自体が難しくなります。

加えて、箇条書きの最後の項目に関する補足として、総務省の学術雑誌 [オンライン広告におけるトラッキングの現状とその法的考察](https://www.soumu.go.jp/main_content/000599872.pdf) によれば

> タレントのコマーシャル起用で知られる大手スポーツジム運営会社の場合、2018 年 5 月の調査時点でサイト閲覧すると閲覧者のブラウザは 86 の広告会社や解析会社などにアクセスし、情報を送信することとなっていたが、執筆者がこのジム運営会社にたずねたところ、把握していたのは代理店 1 社に依頼した 6 事業者の 11 の JavaScript のみであり、残る 75 の情報送信先については気づいていなかった。

だそうです。怖いですね ^^;

（★６）

## CSP を活用した現実解

さて、上で述べた悩ましい現実に立ち向かうべく、方針を表にまとめてみました。

（★７：表）

可能であるならば SOP を活用した対策を採用し、それが難しい場合には保険的対策 …

- 3rd-party JavaScript をタグマネージャー経由で導入し、有事の際にツール上で導入の一時停止を可能にする
- 3rd-party JavaScript 提供事業者との契約で、問題発生時の対処方法を事前に取り決めておく
- 3rd-party JavaScript の安全性をレビューし、可能であれば自社 CDN から配信する

★★

を検討するとともに

難しい場合にはリスク受容しつつも可能な範囲で保険的対策をご検討ください。



方針毎に具体策を掘り下げてゆきます。

### No.1 高機密情報を扱う Web サイトの場合

この場合、セキュリティ重視の方法を採用すべきです。原則として 3rd-party JavaScript の導入は控え、それに加えて ******source-list***★★*** で明示的に許可していない JavaScript はロードや実行を制限しましょう。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example allowed.example ...
```

ちなみに ***'strict-dynamic'*** は明示的に許可した 3rd-party JavaScript からロードされる別な 3rd-party JavaScript についてもロードと実行を許可するための指定ですが、可用性を高める分、明示的に許可する 3rd-party JavaScript は必要最小限とすべきです。

また、高機密情報を扱う以上、3rd-party JavaScript のリスク対策に加えて ***nonce-source*** なども併用し、悪意あるインライン JavaScript が実行されてしまうリスクにも対策しましょう。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example allowed.example ... 'nonce-ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'
```



★★★ナンスを付与していないインラインjsを動かすことができます
★★★それ以外じゃないか、、、順番もかえる

### No.2 通常の Web サイトの場合

この場合、可用性とセキュリティのバランスをふまえた発見的統制手法の採用がおすすめです。手法の趣旨からして全量データを必要とするものではないため、適切なサンプリング処理のもと Web サイト内での 3rd-party JavaScript 実行レポートを作成し、定期的にその内容をチェックします。ヤフーの場合、サービス毎の技術管掌担当に定期的にレポートを確認してもらい、潜在的なリスクを検知した場合には是正措置を検討してもらうことにしています。

また、通常の Web サイトでも ***nonce-source*** は併用すべきですが、取り急ぎで 3rd-party JavaScript 実行レポートを確認したい場合には暫定的に ***'unsafe-inline'*** を指定してください。

## その他の考察

CSP の活用方法についてさらに考察してみます。

### 第三者に対する情報送信調査への活用

総務省は Web サイトから第三者に対して送信される情報に対する透明性を高めるルールとして [外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html) を定めています。このルールに対応するための事前調査や、意図せぬルール違反を回避するための手段として CSP を活用することができます。

例えば、自社管理 CDN からのサブリソースのロードを除き、全てのサブリソースのロードをレポートすることで、第三者に対して送信されている情報をチェックすることができます。

### タグマネージャーへの対応

以下のようなニーズに対して、都度サービス毎の技術管掌担当に応答ヘッダ等の修正を依頼をすることは少々大変です。

- サンプリングの割合を変更したい
- 運用を一時停止したい（+ 再開したい）
- 高機密情報を扱うか否かに応じて対応方法を変えたい

依頼される側としては計画やリソースの調整が発生しますし、依頼する側としてもガバナンスの維持が難しくなるためです。そこで、応答ヘッダではなくタグマネージャーを活用して、この対応を一元管理することはできないか、と考えてみました。

Chrome 114.0.5735.134 で確認した限りでは、

```
<meta http-equiv="Content-Security-Policy" content="script-src 'self'" />
```

のような meta 要素を動的に追加することが可能で、さらに ReportingObserver を用いてレポート内容を最適化したりサンプリングする理もコンテナ内に定義できるため、

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

悪くないアイデアに思えたのですが、残念ながら

> NOTE: The Content-Security-Policy-Report-Only header is not supported inside a meta element.

とのことで発見的統制手法に用いることができず、断念することになりました。サービス毎の手間軽減やガバナンスの維持のためには、運用管理ツールによる支援を検討中です。

ちなみに、この仕様に関する [背景議論](https://github.com/w3c/webappsec-csp/issues/277) の中で

> I really wish we'd stop with meta-element based policies.

のような意見も出ているため、発見的統制手法を抜きにしても meta 要素経由での活用には注意が必要かもしれません。

### まとめ

CSP 仕様の導入部分で

> This document defines Content Security Policy (CSP), a tool which developers can use to lock down their applications in various ways, mitigating the risk of content injection vulnerabilities such as cross-site scripting, and reducing the privilege with which their applications execute.

とありますが、the risk of content injection 対策のみならず、状況に応じた 3rd-party JavaScript のリスク対策や、さらには第三者に対する情報送信調査にも CSP を活用できることをお伝えできたかと思います。みなさまの Web サイトでの CSP の活用のヒントになれば幸いです。

最後に、ヤフーではサービスの「安心と安全」を実現するための仲間を募集中です！われこそはという方のご連絡をお待ちしております。

