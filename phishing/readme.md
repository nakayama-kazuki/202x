# ま、また釣りかよ !!

こんにちは、広告エンジニアの中山です。

以前にも [同様のタイトルの記事](https://www.techscore.com/blog/2017/12/10/phishing/) を書きましたが、そのアップデート版となります。

偽広告経由のフィッシング詐欺をはじめ、関連ニュースが後を絶ちませんが、今回は騙す側の立場に立って

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/0.png' />

の 1～6 について考察を深めることで、フィッシング詐欺への耐性を養いましょう。

## メールや SMS から悪意あるサイトに誘導する

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/1.png' />

攻撃者が直接メールを送信し、悪意あるサイトに誘導する手段として

- 疑われにくい題名を使う
- Non-Delivery Report を偽装する

などがあります。前者で典型的な例は「Re: 経費申請について」や「退職のご挨拶」ですね。

特に「退職のご挨拶」については、手続きとともにアカウントが削除されたり貸与 PC が回収されることもありますので、社外のドメインからのメールでも違和感がありません。

後者はメールアドレスを間違えた時に MTA から送信されるレポートです。

レポートの詳細はリンク先ご確認ください、と悪意のあるサイトに誘導します。

また、攻撃者が直接メールを送信せずに SaaS の機能を活用して間接的にメールを送信する手段もあります。

正規の SaaS を送信元とすることで警戒を解くことが狙いです。

例えば Google ドキュメントのメンションから悪意あるサイトの URL を含んだメールを送信することが可能です。

Google のブログでは [その対策が示されました](https://workspaceupdates.googleblog.com/2022/03/more-information-in-comment-notifications-gmail.html) が、

今後もフィッシング詐欺に SaaS の機能は利用されるでしょう。

最後に SMS の場合は送信者 ID を詐称して本物のように見せかけ警戒を解きます。

- [フィッシング対策協議会からの案内](https://www.antiphishing.jp/news/alert/docomo_20190621.html)
- [ソフトバンクからの案内](https://www.softbank.jp/mobile/info/personal/news/support/20200304a/)

## Web サービスから悪意あるサイトに誘導する

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/2.png' />

## 悪意あるサイトの URL を信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/3.png' />

## 悪意あるサイトを信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/4.png' />

## その他

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/5.png' />

## 悪意ある攻撃を成功に導く

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/6.png' />


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



