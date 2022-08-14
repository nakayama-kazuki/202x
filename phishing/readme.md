# ま、また釣りかよ !!

こんにちは、広告エンジニア & 安全確保支援士の中山です。

広告経由のフィッシング詐欺をはじめ、フィッシング関連ニュースが後を絶ちませんが、今回は騙す側の立場に立って

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/0.png' />

の 1～6 について考察を深めることで、身を守るための一助としたいと思います。彼を知り己を知れば百戦殆からず、ですね。ちなみに、以前にも [同様のタイトルの記事](https://www.techscore.com/blog/2017/12/10/phishing/) を書きましたが、今回はそのアップデート版との位置づけです。

## 1. メールや SMS からフィッシングサイトに誘導

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/1.png' />

まずは攻撃者が直接メールを送信するケースについて考えてみます。

攻撃者はターゲットの警戒を解くために

- 疑われにくい題名を使う<br />（例えば「Re: 経費申請」や「退職のご挨拶」）
- Non-Delivery Report を偽装する

などの手段を用いることがあります。前者の「退職のご挨拶」については、手続きにより会社のアカウントが利用できなくなることが想定できるため、社外のドメインからのメールでも違和感が少ない点が攻撃者にとって好都合です。後者はメールアドレスを間違えた時に MTA から送信されるレポートを偽装し、リンク先で詳細情報を確認させる体裁でフィッシングサイトに誘導します。

次いで、攻撃者が直接メールを送信せずに SaaS の通知機能を活用して間接的にメールを送信するケースについて考えてみます。

正規の SaaS を送信元とすることで、攻撃の隠れ蓑とすることができます。
★★


例えば Google ドキュメントのメンションからフィッシングサイトの URL を含んだメールを送信することが可能でした。この問題については Google から [対策が示されました](https://workspaceupdates.googleblog.com/2022/03/more-information-in-comment-notifications-gmail.html) が、今後も通知機能を有した SaaS は攻撃の隠れ蓑として利用される可能性があります。

最後に攻撃者が直接 SMS を送信するケースについて考えてみます。

SMS の場合はターゲットの警戒を解くために送信者 ID を詐称する可能性があります。

- [フィッシング対策協議会からの注意喚起](https://www.antiphishing.jp/news/alert/docomo_20190621.html)
- [ソフトバンクからの注意喚起](https://www.softbank.jp/mobile/info/personal/news/support/20200304a/)

## 2. Web サービスからフィッシングサイトに誘導

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/2.png' />

Web サービスからの誘導によく使われる手段として

- 掲示板など UGC コンテンツからの誘導
- コミュニケーション機能をもった Web サービスからの誘導

があります。前者は「お宝画像はこちら」などの投稿が典型例です。リンク先で待ち構えているのはお宝画像ではなくフィッシングサイトかもしれません。後者については最近ヤフオクから [質問機能を使ったフィッシングサイト誘導](https://auctions.yahoo.co.jp/topic/notice/other/post_3333/) についての注意喚起がありました。

## 3. フィッシングサイトの URL を詐称

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/3.png' />

URL の詐称によく使われる手段として

- プロクシ機能を持つサービスに便乗
- オープンリダイレクト（脆弱性）に便乗
- テキストと実際のリンク先の異なる A 要素の活用

などがあります。例えば …

```
https://translate.google.com/translate?u=xn--lhr645fjve.jp
```

は URL としては Google サービスですが、表示されるのは「総務省.jp」です（蛇足ですが punycode を使ってカムフラージュしているため、コンテンツを想像することは困難ですね）。メールや SMS では URL がリンクとして扱われる場合もありますので、ターゲットは Google だと信じて誘導されてしまうかもしれません。攻撃者はこのような仕組みを使って URL をミスリードします。

また、こちら …

```
<a href='https://evil-phishing-site.com/'>
    https://docs.google.com/document/d/FILE_ID/preview
</a>
```

は昔からよく使われる URL 詐称の方法で、タグが入稿できる UGC や HTML メールなどで使われます。上記サンプルの場合、ターゲットが少々警戒心を抱いたとしても Google ドキュメントならまあいいか、と考えてしまうところが攻撃者の狙いです。そしてターゲットは evil-phishing-site.com に誘導されてしまいます。

## 4. 悪意あるサイトを信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/4.png' />

ここでは二種類の方法をご紹介します。

一点目は IPA からの [Web メールサービスのアカウントを標的としたフィッシングに関する注意喚起](https://www.jpcert.or.jp/at/2021/at210049.html) で説明されている方法です。

1. 攻撃者はフィッシングサイトに誘導するメールを送信する
2. フィッシングサイトの URL パラメータにメールアドレスを（例えば base64 等でエンコードしつつ）含めます
3. フィッシングサイト側ではパラメータからメールアドレスを復元し、入力欄にオートフィルします
4. ターゲットは 3. によって正規のサービスであると信じ、パスワードを（攻撃者に）送信してしまいます

攻撃者はランダムに大量生成したメールアドレスがたまたまヒットしたのであれ、予めメールアドレスのリストを入手していたのであれ 1. の時点ターゲットのメールアドレストを把握しています。それを URL パラメータに紛れ込ませ、フィッシングサイトでオートフィルするだけ、という簡単なトリックですがターゲットの信頼を獲得する効果は十分にありそうです。

二点目は [以前の記事](https://www.techscore.com/blog/2017/12/10/phishing/) でご紹介した方法です。

1. 攻撃者は Web サービスからフィッシングサイトに誘導する
2. フィッシングサイトはこのタイミングでダミー URL を history.pushState する
3. ターゲットは期待した情報を得られないためヒストリバックする<br />※ このタイミングではターゲットは元の Web サービスに戻れていない
4. フィッシングサイトは onpopstate イベントを hook に遷移元の Web サービスを模した偽サイトに遷移する
5. ターゲットは元の Web サイトに戻ったつもりになる

ターゲットに「ヒストリバックで元のサイトに戻った」と信じさせることができれば、その後再ログインを促すなどで秘密情報を獲得することも可能になります。

## 5. その他攻撃手段

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/5.png' />

```
    QR で特定機能を呼び出す
    アプリ内カスタムURLスキームの脆弱性を使う
    Consent Phishing Attack で同意を得て情報収集
```

## 6. 悪意ある攻撃を成功に導く

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/6.png' />

## まとめ


```

5. 悪意あるコンバージョン獲得の HOW
    マルウェアをインストールさせる
        折り返し電話フィッシング（callback phishing） : https://japan.zdnet.com/article/35190291/
    偽の決済画面での支払いさせる
    アカウント情報を奪う
        Google ログイン
        多要素認証の Man In The Middle : https://xtech.nikkei.com/atcl/nxt/column/18/00676/072100111/

```

