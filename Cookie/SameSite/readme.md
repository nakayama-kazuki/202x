# 図解 SameSite@Set-Cookie

詳細な仕様は RFC 等を参照頂くとして、記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なる記事を執筆してみました。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain)
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite) ※ 本記事

早速ですが SameSite 属性の値と Cookie 送信の関係性は以下の通りです。矢印上にお菓子のクッキーが記載されているリクエストでは Cookie が送信されます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img1.png' />

## SameSite=Strict における GET での流入

SameSite=Strict の Cookie が送信されない図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img2.png' />

SameSite の判定には単純なトップレベルナビゲーションに加えて [幾つかのルール](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-5.2) があります。

> 1. The request is not the result of a cross-site redirect. That is, the origin of every url in the request's url list is same-site with the request's current url's origin.
> 2. The request is not the result of a reload navigation triggered through a user interface element (as defined by the user agent; e.g., a request triggered by the user clicking a refresh button on a toolbar).
> 3. The request's current url's origin is same-site with the request's client's "site for cookies" (which is an origin), or if the request has no client or the request's client is null.

Chrome 117 と Firefox 117 を用いて SameSite の判定を確認してみたところ（テストコンテンツは [こちら](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite/test)）以下のような結果となりました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/strict-1.png' />

SameSite=Strict を用いる以上は CSRF 対策等 GET での流入時に Cookie を送信させたくない理由があるのだと思いますが、一部の流入経路で暫定的に Cookie を送信させたい、という場合にはクライアントプル（表の 1.4）の利用をご検討ください。

その他のユースケースについても確認したところ、リダイレクト時の振る舞いに相違がありました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/strict-2.png' />

## SameSite=Lax における POST での流入

SameSite=Lax の Cookie が送信されない図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img3.png' />

外部サイトからも POST を許したいフォームなどでログインセッション Cookie やトラッキング Cookie が送信されず、加えてトラッキング Cookie はこのタイミングで上書きされてしまう可能性があります。

また SameSite=Strict の 2.3 同様に HTTP Redirect（ステータスコードは 307 か 308）を経由したとしても POST 時に Cookie は送信されませんでしたが、2.4 同様にクライアントプル（ページロード時に POST された情報を埋め込んだフォームを自動送信）にすると Cookie が送信されました。


どうしても救済したいユースケースある場合にはご検討ください。

## SameSite=None を使えば問題なし？

図の赤い背景部分について補足します。

どのみち 3rd-party Cookie は廃止されるので …

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img4.png' />

4年ほど前の調査ですが、Chromeでもthird party cookies削除ボタン
が検討されていた様です。
※テスト実装のみで、正式実装はされなかった様子
https://cptl.corp.yahoo.co.jp/pages/viewpage.action?pageId=2008519198
https://techdows.com/2019/10/google-chrome-canary-now-lets-you-remove-all-third-party-cookies.html

> Edge 88 で Remove all third party cookies ボタンが有効になりましたが
> https://blogs.windows.com/msedgedev/2021/01/21/edge-88-privacy/
> この機能では 1st でも「SameSite=None」をフックに削除
> （ https://twitter.com/ericlaw/status/1352349899518574600 ）


