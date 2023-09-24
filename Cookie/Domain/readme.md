# 図解 Domain@Set-Cookie 

こんにちは、プラットフォームエンジニアの中山です。

詳細な仕様は RFC 等を参照頂くとして、今回は記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なるスタイルの試みです。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain) ※ 本記事
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite)

早速ですが

- 応答ヘッダで Set-Cookie を送信するサーバ自体のドメイン
- その Set-Cookie の Domain 属性の値
- その Set-Cookie が User-Agent（ブラウザ）に受け入れられるか否か
- 受け入れられた Cookie はどのドメインのサーバに送信されるのか

の関係性を図にしてみました。矢印上にお菓子のクッキーが記載されているリクエストは Cookie が送信されることを示しています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-1.png' />

ここまでで大事な部分はお伝えできましたので笑、残りは細かなユースケースで悩みをお持ちの方に読んで頂ければと思います。

## Domain 属性に Set-Cookie を送信するサーバの下位ドメインを指定した場合

左から三番目の Set-Cookie（"Domain=sub.me.example" 属性を持つ）は User-Agent が受け入れを拒否します。セキュリティー上の理由でそのようになっているのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-2.png' />

仮にそうだとしても左から二番目の Set-Cookie（"Domain=me.example" 属性を持つ）によって、下位ドメイン（例えば sub.me.example）に対して任意の Cookie を送信させることは可能であり、セッション固定化攻撃のリスクは軽減できません。というわけでこの仕様の背景は謎ですね。

蛇足ですが、上位ドメインの Cookie ではないことを担保するためには [Cookie Prefixes](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cookie-prefixes-00) が利用できます。

## Domain 属性に Set-Cookie を送信するサーバの上位ドメインを指定した場合

左から二番目の Set-Cookie（"Domain=me.example" 属性を持つ）は User-Agent が受け入れを許可します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/Domain/d-3.png' />


