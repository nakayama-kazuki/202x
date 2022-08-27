# ま、また釣りかよ !!

2022.8.27 追記 : [techscore] (https://blog.techscore.com/entry/2022/08/24/150000) に掲載させていただきました。<br /><br />

<img src='https://www.techscore.com/blog/wp/wp-content/uploads/2017/12/phishing-shutterstock.jpg' />
（Yanik Chauvin / Shutterstock.com）<br /><br />

こんにちは、ヤフー広告エンジニア + 安全確保支援士の中山です（写真は私ではありません）。以前シナジーマーケティングでご一緒させて頂いたこともあり、TECHSCORE BLOG への記事掲載を馬場 CTO にご快諾いただきました ^^ どうもありがとうございます。

かつて [ヤフーの検索連動広告から京都銀行の偽サイトに誘導される](https://www.nikkei.com/article/DGXNASDG2105Z_R20C14A2CR8000/) というニュースがありましたが、広告経由のフィッシング詐欺のみならず、フィッシング関連のニュースが後を絶ちません。IPA の [情報セキュリティ 10 大脅威 2022](https://www.ipa.go.jp/security/vuln/10threats2022.html) によれば「フィッシングによる個人情報等の詐取」が個人部門の第一位となっています。

そこで、今回は攻撃者の立場に立って

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/0.png' />

の 1～6 について考察を深めることで、我々自身を守るヒントとしたいと思います。彼を知り己を知れば百戦殆からず、ですね。ちなみに、以前にも [同様のタイトルの記事](https://www.techscore.com/blog/2017/12/10/phishing/) を書きましたが、今回はそのアップデート版との位置づけです。

## 1. メールや SMS からフィッシングサイトに誘導

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/1.png' />

KnowBe4 の [フィッシング詐偽ヒット率のアセスメント](https://blog.knowbe4.com/knowbe4-2022-phishing-by-industry-benchmarking-report) によれば

> For 2022, the overall PPP baseline average across all industries and size organizations was 32.4%, meaning just less than a third of an average company’s employee base could be at risk of clicking on a phishing email.

企業の従業員の 1/3 近くがメールからフィッシングサイトに誘導されてしまうリスクがあるとのことですが …

#### 1.1. メール送信（直接）

まずは攻撃者が直接メールを送信するケースについて考えてみます。攻撃者としては、とにかくメールを開封させる必要があります。そのために重要になるのはメールの題名です。そこで …

- 慌てさせて、冷静な判断力を奪う題名<br />（例えば「緊急のご連絡」や「アカウントの停止」）
- ありがちで、かつ興味をひく題名<br />（例えば「Re: 勤怠連絡」や「退職のご挨拶」）

を用います。ちなみに「退職のご挨拶」の場合、手続きにより会社のアカウントが利用できなくなることもあり、社外ドメインからのメール送信でも違和感が少ない点が攻撃者にとって好都合です。

また、ときには

- Non-Delivery Report を偽装する

のような手段も用い、メールアドレスを間違えた際の MTA から送信されるレポートを偽装し、詳細情報の確認をリンク先としつつ実際にはフィッシングサイトに誘導します。

#### 1.2. メール送信（間接）

次いで攻撃者が SaaS の通知機能を活用して間接的にメールを送信するケースについて考えてみます。例えば Google ドキュメントのメンションからフィッシングサイトの URL を含んだメールを送信することが可能でした。ターゲットが普段から Google ドキュメントを使ってる場合、疑いを持たずにリンク先に誘導されてしまうかもしれません。この問題については Google から [対策が示されました](https://workspaceupdates.googleblog.com/2022/03/more-information-in-comment-notifications-gmail.html) が、今後も通知機能を有した SaaS は攻撃の隠れ蓑として利用される可能性があります。

#### 1.3. SMS 送信

最後に攻撃者が SMS を送信するケース（SMS を使ったフィッシングをスミッシングを呼ぶのだそう）について考えてみます。SMS の場合は送信者 ID 毎にメッセージがスレッド表示されますが、攻撃者が送信者 ID を詐称することで、正規のサービス事業者と同じスレッドに攻撃者のメッセージが表示される可能性があります。

- [フィッシング対策協議会からの注意喚起](https://www.antiphishing.jp/news/alert/docomo_20190621.html)
- [ソフトバンクからの注意喚起](https://www.softbank.jp/mobile/info/personal/news/support/20200304a/)

キャリア側の努力（フィルタ技術の強化）が実り、日本におけるスミッシング被害がなくなることを期待しましょう。

## 2. Web サービスからフィッシングサイトに誘導

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/2.png' />

Web サービスからの誘導でよく使われる手段に

- インターネット広告からの誘導
- 掲示板などユーザー生成コンテンツ（以下 UGC）からの誘導
- コミュニケーション機能を有する Web サービスからの誘導

などがあります。

インターネット広告の場合は AI や人手による審査でフィッシングサイトへの誘導を含む悪質なものは除去しておりますが、攻撃側も審査をすり抜けるためにあの手この手を使ってきます（というわけで、ヤフー広告でも審査テクノロジーの改善に一緒に取り組んでくれる [エンジニアを募集](https://about.yahoo.co.jp/hr/job-info/engineer/) しております … TECHSCORE での勧誘行為スミマセン笑 ＞ 馬場 CTO）。

掲示板では「お宝画像はこちら」といった投稿をよく見かけますが、リンク先で待ち構えているのはお宝画像ではなくフィッシングサイトかもしれません。コミュニケーション機能については、最近ヤフオクから [質問機能を使ったフィッシングサイト誘導](https://auctions.yahoo.co.jp/topic/notice/other/post_3333/) についての注意喚起がありましたね。

## 3. フィッシングサイトの URL を詐称

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/3.png' />

URL の詐称には

- 短縮 URL サービスを仲介
- プロクシ機能を持つサービスに便乗
- オープンリダイレクト（脆弱性）に便乗
- テキストで表示される URL と実際のリンク先 URL が異なる A 要素の活用

などがよく使われます。例えば translate.google.com については最近 [フィッシング対策協議会からの注意喚起](https://www.antiphishing.jp/news/alert/googletranslate_20220809.html) がありましたが、こちらの URL をご覧ください。

```
https://translate.google.com/translate?u=xn--lhr645fjve.jp
```

URL としては Google サービスですが、表示されるのは総務省のコンテンツです。そして、実際に攻撃者が用いる場合にはフィッシングサイトになるはずです（蛇足ですが punycode を使ってカムフラージュした場合、コンテンツを想像することは一層困難ですね）。メールや SMS では URL がリンクとして扱われる場合もありますので、上記サンプルだと、ターゲットは Google だと信じて誘導されてしまうかもしれません。

また、こちら …

```
<a href='https://evil-phishing-site.example.com/'>
    https://docs.google.com/document/d/FILE_ID/preview
</a>
```

は昔からよく使われる URL 詐称の方法で、タグが入稿できる UGC や HTML メールなどで使われます。公的な案内（を偽装したメッセージ）が Google ドキュメントにリンクしているのは違和感は少ないですよね。そしてターゲットは evil-phishing-site.example.com に誘導されてしまいます。

攻撃者はこれらの方法で URL をミスリードします。

## 4. フィッシングサイトを信頼させる

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/4.png' />

ここまでで、攻撃者はターゲットをフィッシングサイトに誘導できました。しかし、ターゲットもどこか違和感を感じている可能性もあります。攻撃者としてはそれを払拭するためのもう一押しが必要です。ここではフィッシングサイトを信頼させるための二種類の方法をご紹介します。

#### 4.1. オートフィルで信頼を獲得

一つ目は IPA からの [Web メールサービスのアカウントを標的としたフィッシングに関する注意喚起](https://www.jpcert.or.jp/at/2021/at210049.html) で説明されている方法です。

1. 攻撃者はフィッシングサイトに誘導するメールを送信する
2. その際、フィッシングサイトの URL パラメータにメールアドレスを（例えば base64 等でエンコードしつつ）含める
3. フィッシングサイト側ではパラメータからメールアドレスを復元し、入力欄にオートフィルする
4. ターゲットは 3. によって正規のサービスであると信じ、パスワードを（攻撃者に）送信してしまう

大量にランダム生成したメールアドレスがたまたまヒットした場合であれ、予めターゲットとなるメールアドレスのリストを入手していた場合であれ、攻撃者は 1. の時点でメールアドレスを把握できています。それを URL パラメータに紛れ込ませ、フィッシングサイトでオートフィルするだけ、という簡単なトリックですがターゲットの信頼を獲得する効果はありそうです。パスワードマネージャーもしくはサービス側の機能の何れであっても、自分のメールアドレスを知っている = 信頼できるサイト、という心理が働いたとしても無理はありません。

#### 4.2. ヒストリバック … のつもりが

二つ目は [以前の記事](https://www.techscore.com/blog/2017/12/10/phishing/) でご紹介した方法です。UGC 等からおとりサイトに誘導し、ターゲットは自分が欲しい情報がない（おとりなので）ためヒストリバックします。しかし、ヒストリバックをトリガとした JavaScript が動作し、元のサイトではなくそれを模したフィッシングサイトに誘導されてしまいます。ターゲットに「ヒストリバックで元のサイトに戻った」と信じさせることができれば、その後再ログインを促すなどで秘密情報を盗み出すことも可能になります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/demo/2-3.png' />

こちらに [4.2. のデモサイト](https://pj-corridor.net/phishing-demo/trust.html) を用意したので動作をご確認ください。

蛇足ですが、このデモサイトを作る過程で以下のようなブラウザの仕様相違に気が付き、Chrome の onpopstate の発火条件を満たすために意図的なユーザー操作を挿入しております。

|ウェブブラウザ     |ユーザー操作ありの場合 |ユーザー操作なしの場合     |
|:---:              |:---:                  |:---:                      |
|Firefox 103 の場合 |onpopstate が発火する  |onpopstate が発火する      |
|Chrome 103 の場合  |onpopstate が発火する  |onpopstate が発火しない    |

## 5. その他攻撃手段

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/5.png' />

これまで挙げたもの以外にも攻撃者は様々な手段を用います。

#### 5.1. QR コード

QR コードを利用してターゲットをフィッシングサイトに誘導するだけでなく、QR コードから直接攻撃を実行することも考えられます。実は QR コードから実行可能な機能はいろいろとあり、FBI からも [このような注意喚起](https://www.ic3.gov/Media/Y2022/PSA220118) がでています。

> However, cybercriminals are taking advantage of this technology by directing QR code scans to malicious sites to steal victim data, embedding malware to gain access to the victim's device, and redirecting payment for cybercriminal use.

#### 5.2. カスタムスキーム（の脆弱性）

かつて x-avefront というスキームが社会問題となりましたが、同様の問題が WebView を使うアプリにも発生する可能性があります。そしてフィッシングサイトがこの脆弱性を利用する可能性があります。

#### 5.3. Consent Phishing

業務で活用する SaaS が増えると、コラボレーション用途で SaaS からの認可要求通知を受ける機会が増えます。認可要求に対して反射的に承諾してしまう層が一定数存在する可能性があり、悪意あるアプリが認可を得てしまうとターゲットへの攻撃もしくはその前段の情報収集が可能になります。詳しくは [Microsoft の解説](https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/protect-against-consent-phishing) をご覧ください。

そういえば Twitter で「占いアプリ」や「診断アプリ」を認可してしまい、そのアプリがスパムを投稿する（勝手に Tweet する）という騒ぎもありましたね …

## 6. 攻撃を成功に導く

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/phishing/img/6.png' />

そして、いよいよ攻撃者は目的を達成します …

#### 6.1. Callback Phishing

ターゲットは「あなたの PC から異常な通信が検知されました」とのメールを受け、記載されていた電話番号にコールバックします。すると、リモート管理ツールのインストールを促され、ターゲットはマルウェアのインストールを許してしまいます。

#### 6.2. 偽の決済画面

リダイレクト型（外部のサイトに決済を委ねる）の決済方法を用いる EC ショップが、攻撃者によって改ざんされてしまった場合、ターゲットはフィッシングサイト（偽の決済サイト）に誘導されてしまう可能性があります。攻撃者はターゲットの秘密情報を盗みとった後に決済エラー … 例えばトランザクションの混雑などの理由をつけて … を装い、正規の決済画面にターゲットをリダイレクトし、ターゲットは改めて決済を完了します。この場合、ターゲットが秘密情報を盗まれたことに気付くことは難しく、フィッシングサイトの発見が遅れてしまうケースが多く見られます。

#### 6.3. 偽のソーシャルログイン

フィッシングサイトがソーシャルログイン機能を有していた場合、サービスに興味を持ったターゲットはソーシャルログインを試みるかもしれません。しかしながら、ソーシャルログインを提供する IdP 自体がフィッシングサイトである可能性もあります（つまりサービスはおとりで、ソーシャルログインが本命）。疑いを持てなかったターゲットは秘密情報を盗まれてしまいます。

#### 6.4. 多要素認証の Adversary In The Middle 攻撃

多要素認証を使っていれば万が一にも大丈夫、とおもいきや多要素認証を突破する Adversary In The Middle 攻撃について [Microsoft からの注意喚起](https://www.microsoft.com/security/blog/2022/07/12/from-cookie-theft-to-bec-attackers-use-aitm-phishing-sites-as-entry-point-to-further-financial-fraud/) がありました。

## まとめ

以上、攻撃者のクリエイティビティー（苦笑）はいかがでしたでしょうか。そのクリエイティビティーを違うことに発揮してほしいところですが、現実に彼らはあの手この手で我々から秘密情報を盗み出そうとしますので、そうした手段を知ることによって自衛のヒントとして頂けますと幸いです。業務でもプライベートでも、これまでに述べたシチュエーションに遭遇する可能性はあると思いますが、そのようなときに「ん？ちょっと待てよ」とフィッシングの可能性を疑ってみてください。

