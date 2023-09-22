# 図解 SameSite@Set-Cookie

こんにちは、プラットフォームエンジニアの中山です。

詳細な仕様は RFC 等を参照頂くとして、今回は記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なるスタイルの試みです。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain)
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite) ※ 本記事

早速ですが SameSite 属性の値とブラウザから送信される Cookie の関係性を図にしてみました。矢印上にお菓子のクッキーが記載されているリクエストに限り Cookie が送信されます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img1.png' />

ここまでで大事な部分はお伝えできましたので笑、残りは細かなユースケースで悩みをお持ちの方に読んで頂ければと思います。

## SameSite=Strict における GET での流入

図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img2.png' />

SameSite の判定には [細かなルール](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-5.2) があります。

> 1. The request is not the result of a cross-site redirect. That is, the origin of every url in the request's url list is same-site with the request's current url's origin.
> 2. The request is not the result of a reload navigation triggered through a user interface element (as defined by the user agent; e.g., a request triggered by the user clicking a refresh button on a toolbar).
> 3. The request's current url's origin is same-site with the request's client's "site for cookies" (which is an origin), or if the request has no client or the request's client is null.

そこで Chrome 117 と Firefox 117 を使い [こちらのテスト](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite/test) を試してみたところ …

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/strict-1.png' />

のような結果となりました。SameSite=Strict を用いつつも一部の流入経路で暫定的に Cookie を送信させたい、という場合には location.href を用いた自動遷移（表の 1-4）の利用をご検討ください。

その他のユースケースについては以下の通りです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/strict-2.png' />

## POST での流入

図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img3.png' />

外部サイトからも POST を許可したいフォームがあった場合、SameSite=Strict なログインセッション Cookie や SameSite=Lax なトラッキング Cookie がフォームに送信されません。加えて流入のタイミングでトラッキング Cookie が上書きされてしまう場合があります。

POST での流入時に Cookie を送信させたい場合のアイデアは GET の場合と同様です。ステータスコード 307 / 308 の HTTP Redirect を経由させても Cookie は送信されませんが、流入元で POST された情報を埋め込んだフォームを生成し HTMLFormElement.submit() を用いた自動遷移（表の 4-4）の利用をご検討ください。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/lax.png' />

## SameSite=None を使えば機会損失なし？

図の赤い背景部分について補足します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img4.png' />

遠からず 3rd-party Cookie が廃止され CSRF のリスクも小さくなるので、今は制約条件の少ない SameSite=None にしておけばいいじゃないか … という考え方もあるかもしれませんが、ブラウザのプライバシー関連機能で SameSite=None は不利な扱いを受ける可能性があります。例えば Cookie 削除の UI に「全ての Cookie」と「3rd-party Cookie」の 2 つを設け、後者については SameSite=None の Cookie を削除する、といった具合です。こちらの記事もご参考に。

- https://techdows.com/2019/10/google-chrome-canary-now-lets-you-remove-all-third-party-cookies.html
- https://blogs.windows.com/msedgedev/2021/01/21/edge-88-privacy/

このようなリスクも考慮の上で採用をご検討ください。

p.s.

蛇足ですが [4 年前](https://www.techscore.com/blog/2019/07/26/samesite/) にもこんな予想をしていました。

> ある日突然 SameSite=None な Cookie に対するデフォルト動作が変更されるかもしれません …

