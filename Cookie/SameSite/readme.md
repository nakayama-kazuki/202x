# 図解 SameSite@Set-Cookie

詳細な仕様は RFC 等を参照頂くとして、記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なるスタイルでの執筆を試みました。

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

その他のユースケースについては以下の通りです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/strict-2.png' />

## SameSite=Lax における POST での流入

SameSite=Lax の Cookie が送信されない図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img3.png' />

外部サイトからも POST を許可したいフォームなどでログインセッション Cookie やトラッキング Cookie が送信されず、加えて流入タイミングでトラッキング Cookie が上書きされてしまう可能性もあります。

POST での流入時に Cookie を送信させたい場合のアイデアは上述 SameSite=Strict の場合と同様です。ステータスコード 307 / 308 の HTTP Redirect を経由させても Cookie は送信されませんが、クライアントプル（流入元で POST された情報を埋め込んだフォームを自動送信 … 少々面倒ですね）にすることで POST 時に Cookie が送信されることを確認しました。

## SameSite=None を使えば問題なし？

全てのユースケースで Cookie が送信される図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img4.png' />

遠からず 3rd-party Cookie は廃止されて CSRF のリスクも減るので、とりあえず制約条件の少ない SameSite=None にしておけばいいじゃないか … という考え方もあるかもしれませんが、ブラウザのプライバシー関連機能で SameSite=None は不利な扱いを受ける可能性があります。

- [Edge の Remove all third party cookies ボタン](https://blogs.windows.com/msedgedev/2021/01/21/edge-88-privacy/) では SameSite=None な Cookie を削除
- [Chrom でも同様の検討](https://techdows.com/2019/10/google-chrome-canary-now-lets-you-remove-all-third-party-cookies.html) ※ こちらは正式実装には至らず

このようなリスクも考慮の上で採用をご検討ください。

p.s.

蛇足ですが [4 年前](https://www.techscore.com/blog/2019/07/26/samesite/) にもこんな予想をしていました。

> ある日突然 SameSite=None な Cookie に対するデフォルト動作が変更されるかもしれません …

