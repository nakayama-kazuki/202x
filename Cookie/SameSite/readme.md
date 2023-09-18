# 図解 SameSite@Set-Cookie

詳細な仕様は RFC 等を参照頂くとして、記憶への残りやすさを目標に図解シリーズ（… といっても 2 本ですが）を執筆しました。

- [図解 Domain@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/Domain)
- [図解 SameSite@Set-Cookie](https://github.com/nakayama-kazuki/202x/tree/main/Cookie/SameSite)

というわけで SameSite の値と Cookie 送信の関係性はこちらの通りです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img1.png' />

## Strict で GET の流入を救済したい場合はどうする？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img2.png' />

## Lax で POST の流入を救済したい場合はどうする？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img3.png' />

## None を使えば問題なし？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/Cookie/SameSite/img4.png' />

