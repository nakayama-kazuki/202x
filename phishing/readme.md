# ま、また釣りかよ !!

こんにちは、広告エンジニア兼安全確保支援士の中山です。

広告経由のフィッシング詐欺をはじめ、フィッシング関連ニュースが後を絶ちませんが、今回は攻撃者の立場に立って

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/0.png' />

の 1～6 について考察を深めることで、我々の身を守るためのヒントを得たいと思います。彼を知り己を知れば百戦殆からず、ですね。ちなみに、以前にも [同様のタイトルの記事](https://www.techscore.com/blog/2017/12/10/phishing/) を書きましたが、今回はそのアップデート版との位置づけです。

## 1. メールや SMS からフィッシングサイトに誘導

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/1.png' />

#### 直接メール送信

まずは攻撃者が直接メールを送信するケースについて考えてみます。

攻撃者としては、とにもかくにもメールを開封してもらう必要があります。そこで …

- ありがちで、かつ興味をひく題名を使う<br />（例えば「Re: 勤怠連絡」や「退職のご挨拶」）
- Non-Delivery Report を偽装する

などの手段を用います。前者の「退職のご挨拶」については、手続きにより会社のアカウントが利用できなくなることもあるため、社外のドメインからのメールでも違和感が少ない点が攻撃者にとって好都合です。後者はメールアドレスを間違えた際の MTA から送信されるレポートを偽装し、リンク先で詳細情報を確認させる体裁でフィッシングサイトに誘導します。

#### 間接メール送信

次いで攻撃者が SaaS の通知機能を活用して間接的にメールを送信するケースについて考えてみます。

★★

攻撃者はターゲットの警戒を解くために正規の SaaS の通知機能を隠れ蓑として活用します。例えば Google ドキュメントのメンションからフィッシングサイトの URL を含んだメールを送信することが可能でした。この問題については Google から [対策が示されました](https://workspaceupdates.googleblog.com/2022/03/more-information-in-comment-notifications-gmail.html) が、今後も通知機能を有した SaaS は攻撃の隠れ蓑として利用される可能性があります。

#### SMS 送信


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

は URL としては Google サービスですが、表示されるのは https://www.soumu.go.jp/ のコンテンツです（蛇足ですが punycode を使ってカムフラージュしているため、コンテンツを想像することは一層困難ですね）。メールや SMS では URL がリンクとして扱われる場合もありますので、ターゲットは Google だと信じて誘導されてしまうかもしれません。攻撃者はこのような仕組みを使って URL をミスリードします。

また、こちら …

```
<a href='https://evil-phishing-site.com/'>
    https://docs.google.com/document/d/FILE_ID/preview
</a>
```

は昔からよく使われる URL 詐称の方法で、タグが入稿できる UGC や HTML メールなどで使われます。

★★ここは違うかも

上記サンプルの場合、ターゲットが少々警戒心を抱いたとしても Google ドキュメントならまあいいか、と考えてしまうところが攻撃者の狙いです。そしてターゲットは evil-phishing-site.com に誘導されてしまいます。

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

1. 攻撃者は特定の Web サービスからフィッシングサイトに誘導する
2. フィッシングサイトはこのタイミングでダミー URL を history.pushState する
3. ターゲットは期待した情報を得られないためヒストリバックする<br />※ 実はこのタイミングではターゲットは元の Web サービスに戻れていない
4. フィッシングサイトは onpopstate イベントをトリガして遷移元の Web サービスを模した偽サイトに遷移する
5. ターゲットは元の Web サイトに戻ったつもりになる

ターゲットに「ヒストリバックで元のサイトに戻った」と信じさせることができれば、その後再ログインを促すなどで秘密情報を獲得することも可能になります。

## 5. その他攻撃手段

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/5.png' />

これまで挙げたもの以外にも攻撃手段があります。

### QR コード

攻撃者が QR コードを利用してターゲットをフィッシングサイトに誘導する可能性のみならず、QR コードから直接攻撃を実行することも考えられます（実は QR コードから実行可能な機能はいろいろとあります）。

### アプリ内カスタム URL スキーム（の脆弱性）

かつては x-avefront というスキームが社会問題となりましたが、同様の問題は WebView を使うアプリにも発生する可能性があります。フィッシングサイトがこの脆弱性を利用する可能性があります。

### Consent Phishing

業務で活用する SaaS が増えると、コラボレーション用途で SaaS から認可を求める通知が来る機会も増えます。認可要求に対して反射的に承諾してしまう層は一定数存在するかもしれませんが、悪意あるアプリが認可を得てしまうとターゲットへの攻撃もしくはその前段の情報収集が可能になります。詳しくは [Microsoft の解説](https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/protect-against-consent-phishing) をご覧ください。

## 6. 悪意ある攻撃を成功に導く

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/6.png' />

いよいよ攻撃者は目的を達成します。

### Callback Phishing

https://japan.zdnet.com/article/35190291/

### 偽の決済画面

### 偽のソーシャルログイン

### 多要素認証の Man In The Middle

https://xtech.nikkei.com/atcl/nxt/column/18/00676/072100111/

## まとめ

攻撃者の創意工夫（苦笑）はいかがでしたでしょうか。


