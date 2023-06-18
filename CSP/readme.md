★★全体構成
★★下の方変だった

# CSP を活用した 3rd-party JavaScript のリスク対策

こんにちは、プラットフォームエンジニアの中山です。

Web サイトにはしばしば 3rd-party JavaScript を導入することがあります。例えば Google Analytics のような Web 解析ツール、いいねボタンのような SNS 連携機能、広告掲載や効果測定目的のコードスニペットなどは多くの Web サイトで導入されています。

その一方で 3rd-party JavaScript には Web サイトを閲覧するユーザーに対して悪影響を与えるリスクも存在するため、その導入とあわせたリスク対策も必要となります。

そこで、今回の記事では Content Security Policy（以降 CSP と略します）の Fetch ディレクティブを活用した 3rd-party JavaScript のリスク対策についてお伝えしたいと思います。

## CSP Fetch ディレクティブとは

詳しくは [W3C 仕様](https://www.w3.org/TR/CSP3/) を確認頂くとして、その概念を絵にしたものがこちらです。

（★１：Fetch ディレクティブの説明）

Web ブラウザに対して、サブリソースのロードや JavaScript の実行に関する許可リスト（以降 ***source-list*** と呼びます）を指示することで、意図しない外部へのデータ送信や、悪意のある JavaScript の実行リスクなどを軽減することができます。

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

## 現実は悩ましい？

では、冒頭で述べた 3rd-party JavaScript のリスクとその対策について、もう少し掘り下げてみましょう。

Web ブラウザの開発者ツールを使うことで Web サイトに導入されている 3rd-party JavaScript を確認することができます。

（★２：開発者ツール）

ご覧の通り、ヤフーでも幾つかの 3rd-party JavaScript が導入されています。

このとき、もし 3rd-party JavaScript を提供する事業者に悪意があったり、悪意はなくとも別な攻撃者によってホスト先の CDN やリポジトリ上の JavaScript コードが改変されていた場合、Web サイト内の情報 … ユーザーのアカウントに紐づく個人情報が含まれるかもしれません … が盗まれたり、ユーザーが [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) されてしまう、などのリスクが生じます。

（★３）

このようなリスクに対して、Web ブラウザの Same Origin Policy（以降 SOP と略します）という仕様を活用した対策があります。

1. ドメイン ***safe.example*** から text/html 文書「Ａ」をロードする
2. 文書「Ａ」内の iframe 要素経由で（***safe.example*** とは別の）ドメイン ***unsafe.example*** の text/html 文書「Ｂ」をロードする
3. 文書「Ｂ」内で 3rd-party JavaScript をロードして実行する

こうすることで、もし 3rd-party JavaScript を提供する事業者に悪意があったとしても、その影響範囲を iframe 内に限定することができます。何故なら、文書「Ｂ」で実行される JavaScript は SOP によって文書「Ａ」の DOM にアクセスすることができないためです。

（★４）

ところが、Web 解析ツールや広告のビューアビリティー計測など 3rd-party JavaScript がその目的を達成するために文書「Ａ」の DOM にアクセスする必要がある場合、この対策を採用することができません。であれば、信頼できる 3rd-party JavaScript はリスクを受容（***source-list*** に追記）し、それ以外の 3rd-party JavaScript については CSP Fetch ディレクティブを活用してロードと実行を制限するのがよさそうです。

（★５）

しかしながら、現実はもう少し複雑で、悩ましくもあります。なぜなら多くの Web サイトでは

- 3rd-party JavaScript の信頼性判断は容易ではない
- タグマネージャーを使ってマーケティング担当が（開発担当の与り知らない）3rd-party JavaScript を導入する場合がある
- ある事業者の 3rd-party JavaScript から別な … しばしば複数の … 事業者の 3rd-party JavaScript がロードされる場合がある

などの前提のもとで運用する必要があるためです。こうなると ***source-list*** に基づいて 3rd-party JavaScript のロードや実行を制限しようにも、その ***source-list*** を用意すること自体が難しくなります。

加えて、箇条書きの最後の項目に関する補足として、総務省の学術雑誌 [オンライン広告におけるトラッキングの現状とその法的考察](https://www.soumu.go.jp/main_content/000599872.pdf) によれば

> タレントのコマーシャル起用で知られる大手スポーツジム運営会社の場合、2018 年 5 月の調査時点でサイト閲覧すると閲覧者のブラウザは 86 の広告会社や解析会社などにアクセスし、情報を送信することとなっていたが、執筆者がこのジム運営会社にたずねたところ、把握していたのは代理店 1 社に依頼した 6 事業者の 11 の JavaScript のみであり、残る 75 の情報送信先については気づいていなかった。

だそうです。怖いですね ^^;

（★６）

## CSP Fetch ディレクティブを活用した現実解

さて、上で述べた悩ましい現実に立ち向かうべく、方針を表にまとめてみました。

（★７：表）

方針毎に具体策を掘り下げてゆきます。

### 1. 高機密情報を扱う Web サイトの場合

この場合、セキュリティー重視の方法を採用すべきかと思います。基本的に 3rd-party JavaScript の導入は必要最小限とし、その上で ***source-list*** で明示的に許可しない 3rd-party JavaScript は実行を停止しましょう。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example allowed.example ...
```

なお ***'strict-dynamic'*** は信頼する 3rd-party JavaScript からロードされる別な 3rd-party JavaScript についてもロードと実行を許可するための指定です。

さらに 3rd-party JavaScript のリスク対策に留まらず、***source-list*** に ***nonce-source*** や ***hash-source*** も併用して悪意あるインライン JavaScript の実行リスクにも対策することをお勧めします。

```
Content-Security-Policy: script-src 'strict-dynamic' safe.example allowed.example ... 'nonce-ch4hvvbHDpv7xCSvXCs3BrNggHdTzxUA'
```

### 2. 通常の Web サイトの場合

この場合、可用性とセキュリティーのバランスをふまえた発見的統制手法をお勧めします。手法の趣旨からして全量データを必要とするものではないため、適切なサンプリング処理のもと Web サイト内での 3rd-party JavaScript 実行レポートを作成し、定期的にその内容をチェックします。ヤフーの場合、サービス毎の技術管掌担当に定期的にレポートを確認してもらい、潜在的なリスクを検知した場合には是正措置を検討してもらうことにしています。

通常の Web サイトでも悪意あるインライン JavaScript の実行リスクには対策すべきですが、それに先立って 3rd-party JavaScript 実行レポートを確認したい場合は ***source-list*** に ***'unsafe-inline'*** を指定してください。

### それ以外の場合

SOP を活用した対策が採用可能ならばそれを採用、難しい場合にはリスク受容しつつも可能な範囲で保険的対策をご検討ください。

- 3rd-party JavaScript をタグ管理システムで導入し、有事の際にツール上で導入の一時停止を可能にする
- 3rd-party JavaScript 提供事業者との契約で、問題発生時の対処方法を事前に取り決めておく
- 3rd-party JavaScript コードをレビューし、可能であれば自社 CDN から配信する

## その他の考察

### 外部送信規律への対応

総務省は Web サイトから第三者に対して送信される情報に対する透明性を高めるルールとして [外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html) を定めています。このルールに対応するための事前調査や、ルール違反を回避するための手段として CSP Fetch ディレクティブを活用することができます。

### タグマネージャーへの対応

扱う情報に応じて対応方法を変えたい、応答ヘッダを使いたい、適切にサンプリングしたい、適宜運用を見直したい … などのニーズに対してオンデマンドでサービス毎に作業依頼をする場合、依頼される側としては都度リソース等の調整が必要になり、依頼する側としてもガバナンスの維持が困難です。

CSP Fetch ディレクティブは動的に meta 要素として追加定義することができるため、タグマネージャーにそのためのコードスニペットを登録し、サービス担当者の手を煩わせることなくタグマネージャー経由で ***source-list*** を配信することを検討してみました。

この場合 ReportingObserver を用いてレポート内容を最適化したり、サンプリング処理もコードスニペット内に定義できるため、悪くない方法に思えたのですが

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

残念ながら発見的統制手法が使えないため断念し、サービス担当者の負担軽減のためにはツールによる支援を検討中です。

> NOTE: The Content-Security-Policy-Report-Only header is not supported inside a meta element.

ちなみに、この仕様に関する [背景議論](https://github.com/w3c/webappsec-csp/issues/277) の中で

> I really wish we'd stop with meta-element based policies.

のような意見も出ているため、発見的統制手法を抜きにしても meta 要素での CSP Fetch ディレクティブの活用には注意が必要そうです。

### まとめ

W3C 仕様の導入部分で

> This document defines Content Security Policy (CSP), a tool which developers can use to lock down their applications in various ways, mitigating the risk of content injection vulnerabilities such as cross-site scripting, and reducing the privilege with which their applications execute.

とありますが the risk of content injection 対策のみならず 3rd-party JavaScript に対する現実的なリスク対策に加え、外部送信規律への対応にも CSP Fetch ディレクティブを活用できることをお伝えできたかと思います。みなさまの Web サイトでも CSP Fetch ディレクティブの活用をご検討ください。

また、ヤフーではサービスの「安心と安全」を実現するための仲間を募集中です！われこそはという方のご連絡をお待ちしております。

