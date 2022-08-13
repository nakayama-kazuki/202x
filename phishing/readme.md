# ま、また釣りかよ !!

こんにちは、広告エンジニアの中山です。

広告経由のフィッシング詐欺をはじめ、フィッシング関連ニュースが後を絶ちませんが、今回は騙す側の立場に立って

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/0.png' />

の 1～6 について考察を深め、フィッシング詐欺への耐性を養いたいと思います。ちなみに、以前にも [同様のタイトルの記事](https://www.techscore.com/blog/2017/12/10/phishing/) を書きましたが、今回はそのアップデート版との位置づけです。

## 1. メールや SMS から悪意あるサイトに誘導する

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/1.png' />

まずは攻撃者が直接メールを送信するケースについて考えてみます。攻撃者はターゲットの警戒をくぐりぬけるために

- 疑われにくい題名を使う<br />（例えば「Re: 経費申請」や「退職のご挨拶」）
- Non-Delivery Report を偽装する

などの手段を用いることがあります。前者の「退職のご挨拶」については、手続きで会社のアカウントが利用できなくなることが想定できるため、社外のドメインからのメールでも違和感が少ない点が攻撃者にとって好都合です。後者はメールアドレスを間違えた時に MTA から送信されるレポートを偽装し、リンク先で詳細情報を確認させる体裁で悪意あるサイトに誘導します。

次いで、攻撃者が直接メールを送信せずに SaaS の機能を活用して間接的にメールを送信するケースについて考えてみます。正規の SaaS を送信元とすることで、攻撃の隠れ蓑とすることができます。例えば Google ドキュメントのメンションから悪意あるサイトの URL を含んだメールを送信することが可能でした。この問題については Google から [対策が示されました](https://workspaceupdates.googleblog.com/2022/03/more-information-in-comment-notifications-gmail.html) が、今後も通知機能を有した SaaS は攻撃の隠れ蓑として利用されるのではないかと思います。

最後に攻撃者が直接 SMS を送信するケースについて考えてみます。SMS の場合は送信者 ID を詐称して本物のように見せかけターゲットの警戒をくぐりぬけます。

- [フィッシング対策協議会からの案内](https://www.antiphishing.jp/news/alert/docomo_20190621.html)
- [ソフトバンクからの案内](https://www.softbank.jp/mobile/info/personal/news/support/20200304a/)

## 2. Web サービスから悪意あるサイトに誘導する

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/2.png' />

掲示板など UGC コンテンツからの誘導や、コミュニケーション機能をもった Web サービスからの誘導が考えられます。前者は「お宝画像はこちら」などの投稿が典型的です。後者は最近ヤフオクから [質問機能を使ったフィッシングサイト誘導](https://auctions.yahoo.co.jp/topic/notice/other/post_3333/) についての注意喚起がありました。

## 3. 悪意あるサイトの URL を信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/3.png' />

HTML で Google Drive を指す（★）
オープンリダイレクトで URL を（★）

## 4. 悪意あるサイトを信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/4.png' />

オートフィルトリック（★）
中山式デコイ作戦（★）


## 5. その他

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/5.png' />

## 6. 悪意ある攻撃を成功に導く

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/6.png' />

## まとめ


```

1. SMS / メールから悪意あるサイトに誘導する HOW
    攻撃者が直接送信するメール
        アドレスの誤り？（Non-Delivery Report）
        普通にありそうな subject（Re: とか退職の挨拶とか）
        送信者 ID の詐称 : https://gigazine.net/news/20220628-sms-phishing/
    攻撃者が間接的に送信するメール
        Google Docs からのメンション

2. Web サービスから悪意あるサイトに誘導する HOW
    ヤフオク!落札者の質問と見せかけフィッシングサイトに誘導 : https://www.itmedia.co.jp/news/articles/2207/05/news178.html

3. 悪意あるサイトの URL を信頼させる HOW
    HTML で Google Drive を指す（★）
    オープンリダイレクトで URL を（★）

4. 悪意あるサイトを信頼させる HOW
    オートフィルトリック（★）
    中山式デコイ作戦（★）

5. 悪意あるコンバージョン獲得の HOW
    マルウェアをインストールさせる
        折り返し電話フィッシング（callback phishing） : https://japan.zdnet.com/article/35190291/
    偽の決済画面での支払いさせる
    アカウント情報を奪う
        Google ログイン
        多要素認証の Man In The Middle : https://xtech.nikkei.com/atcl/nxt/column/18/00676/072100111/

6. その他
    QR で特定機能を呼び出す
    アプリ内カスタムURLスキームの脆弱性を使う
    Consent Phishing Attack で同意を得て情報収集
```



