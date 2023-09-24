# 図解 Domain@Set-Cookie 

こんにちは、プラットフォームエンジニアの中山です。

詳細な仕様は RFC 等を参照頂くとして、今回は記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なるスタイルの試みです。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain) ※ 本記事
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite)

早速ですが …

- 応答ヘッダで Set-Cookie を送信するサーバアプリケーション自身のドメイン
- その Set-Cookie の Domain 属性の値
- その Set-Cookie が User-Agent（ブラウザ）に受け入れられるか否か
- 受け入れられた Cookie はどのドメインのサーバに送信されるのか

の関係性を図にしてみました。矢印上にお菓子のクッキーが記載されているリクエストは Cookie が送信されることを示しています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-1.png' />

ここまでで大事な部分はお伝えできましたので笑、残りは細かなユースケースで悩みをお持ちの方に読んで頂ければと思います。

## Domain 属性に Set-Cookie を送信するサーバの下位ドメインを指定

図の 1-3 の Set-Cookie の場合 User-Agent は受け入れを拒否します。セキュリティー上の理由でそのようになっているのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-2.png' />

仮にそうだとしても図の 1-2 の Set-Cookie によって、下位ドメイン（例えば sub.me.example）に対して任意の Cookie を送信させることは可能であり、セッション固定化攻撃のリスクを解消することはできていません。というわけでこの仕様の背景は謎ですね。

ちなみに &lt;cookie-name&gt; に __Host（[Cookie Prefixes](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cookie-prefixes-00)）を用いた Set-Cookie は

> MUST NOT contain a "Domain" attribute

ですので上位ドメインの Cookie ではないことを担保することができます。

## Domain 属性に Set-Cookie を送信するサーバの上位ドメインを指定

図の 2-2 の Set-Cookie の場合 User-Agent は受け入れを許可します。下位ドメインを横断した User-Agent 単位のログ収集目的でこの Domain 属性が用いられます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-3.png' />

ところで 1-2 の Set-Cookie 実行後、同じ &lt;cookie-name&gt; を使って 2-1, 2-2, 2-3 の Set-Cookie を実行した場合に User-Agent がどのように振舞うのかをテストしてみましょう。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-4.png' />

結論から述べますと 2-2 は 1-2 を上書きします（逆も言えます）。また 2-1, 2-2, 2-3 は同じ &lt;cookie-name&gt; であっても別の Cookie として扱われ、お菓子のクッキーが記載されているリクエストでは全ての対象 Cookie が送信されます。

例えば

```
Cookie: MyCookie=BY_2-1; MyCookie=BY_2-2; MyCookie=BY_2-3
```

もしくは

```
Cookie: MyCookie=BY_2-1; MyCookie=BY_1-2; MyCookie=BY_2-3
```

のようなイメージです。もちろんサーバのアプリケーションは &lt;cookie-name&gt; で Cookie を区別できなくなってしまうため、同じ &lt;cookie-name&gt; の利用はトラブルの元と言えます。

p.s.

蛇足ですが [6 年前](https://www.techscore.com/blog/2017/10/06/about-cookie/) 似たようなことを試してました ^^;

> HTTP Set-Cookie の結果と document.cookie への書き込み結果は別々に管理されて
