# 図解 Domain@Set-Cookie 

こんにちは、プラットフォームエンジニアの中山です。

詳細な仕様は RFC 等を参照頂くとして、今回は記憶と印象への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）なるスタイルの試みです。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain) ※ 本記事
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite)

早速ですが Domain 属性の値とブラウザから送信される Cookie の関係性を図にしてみました。矢印上にお菓子のクッキーが記載されているリクエストに限り Cookie が送信されます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img1.png' />

ここまでで大事な部分はお伝えできましたので笑、残りは細かなユースケースで悩みをお持ちの方に読んで頂ければと思います。
