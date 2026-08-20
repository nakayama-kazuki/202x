ITP が始まってから Google が PrivacySandbox を非推奨として 3rd-party Cookie を継続するに至るまでに振り回されてきた Tracking Cookie を使った実装の歴史を記事にしたい。どう思う？

以前 Cookie の記事ばかり書いていたので


1. 改めて Tracking Cookie について

嫌われものの Tracking Cookie。だけど無償メディアを支えたり No の意思の保持（オプトアウト）やフリクエンシーの制御にも実は重要 … 的なエクスキューズと、何故ここまで嫌われるに至ったのかの事業者のプライバシーを軽視した（とりわけマーケ、広告系）の黒歴史と今後の改善展望について

2. ITP からはじまった Privacy First の歴史

ITP/PrivacySandbox や各国の法律、プライバシー製品（主にブラウザ）についての共有

3. Tracking Cookie に関する実装

3.1. 簡単な実装共有。なければ Set-Cookie。ただし、ブラウザバグで Cookie を上書きしてしまう問題とその対策
3.2. Private Browsing 問題。そのままユニークユーザーカウントすると日本の人口を上回る。これをどうする？
3.3. SameSite 問題。トラッキングしたいなら None にすればいいが、そんな簡単な問題？ブラウザ仕様で None Cookie が不利な扱いを受けない？
3.4. 事業者たちの努力（CNAME、RD）

などなど、業務経験なしでは書けない裏の苦労



3rd-party Cookie 利用の裏側

「Tracking Cookieはなぜ嫌われ、そして生き残ったのか」
「ITPからPrivacy Sandboxまで、現場が振り回された10年」
「Cookieは死ななかった：プライバシー時代のトラッキング実装史」

「3rd-party Cookie は嫌われ、しかし生き残った」

「嫌われて、しかし生き残った 3rd-party Cookie 関連実装の舞台裏」

