# そのデータ活用、ダウト！

/*

ToDo :

- 文言見直し : 本人 vs ユーザー
- 文言見直し : 情報 vs データ（個人情報、個人データ）
- 文言見直し : 利用 vs 活用
- 表や見出しの文言見直し
- CBPR とれば越境の委託でも同意不要になる？
- 当初記載していた LY ではいろいろやってるよ的な文言
- 個情法の説明はそれとわかるようにする
- https://www.ppc.go.jp/all_faq_index/faq2-q2-3/

*/

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや社内業務において、データを活用して課題を解決する機会は少なくないと思います。一方でデータを取り扱う際には法律やパートナーとの契約を順守することに加えて、プライバシーへの配慮もかかせません。そこで今回は「安心安全のデータ活用」の際の留意点についてまとめてみました。各章ごとに設けた「Doubt!」アイコンのチェック項目について、みなさまのデータ活用の際に参考にして頂ければ幸いです。

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i1.png' />

個人情報保護法によれば、直接取得した情報（例えばユーザーがフォームに入力したデータやトラッキングログなど）を個人データ化する際、何のデータをどのような目的で活用するのか [具体的に特定](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) し [ユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-3) することが必要になります。加えて目的外の活用は [できません](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) 。例えば問い合わせ対応を目的して取得したメールアドレスを、広告のオーディエンス連携や類似拡張に活用することはできません。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 規約やプライバシーポリシーなどで目的を説明してるか？
- 目的は具体的に特定されているか？
- 目的外の活用はないか？

## （２）直接取得の際の同意取得

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i2.png' />

個人情報保護法によれば、ユーザーの同意を得ずに要配慮個人情報（例えば人種、病歴、健康診断の結果、犯罪歴）を取得することは [できません](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2) 。とはいえ、入力フォーム等で適正に直接取得する限りにおいては、改めての同意ポップアップは不要です。

他方、要配慮個人情報ならずとも最近は Cookie に関する同意ポップアップを目にする機会が増えました。この背景には EU の ePrivacy Regulation における Cookie 規制 …

- マーケティング用途のトラッキング Cookie の利用にはユーザー同意が必要
- ただしサービス提供に必須（例えばログインセッションの管理）となる Cookie の利用にはユーザー同意は不要

があります。しかし、この同意ポップアップについてはプライバシー保護の観点で実効性を疑う意見（例えば [Reflecting on 18 years at Google](https://ln.hixie.ch/?start=1700627373#:~:text=one%20of%20the%20most%20annoying%20is%20the%20prevalence%20of%20pointless%20cookie%20warnings%20we%20have%20to%20wade%20through%20today)）もあります。

> one of the most annoying is the prevalence of pointless cookie warnings we have to wade through today

既に Safari の 3rd-party Cookie は廃止され、Firefox はドメインごとに Cookie を分離して管理するため 3rd-party Cookie による名寄せができません。そして今年はいよいよ Chrome の 3rd-party Cookie が [段階的に廃止](https://japan.googleblog.com/2023/12/chrome-cookie.html) されます。ますます実効性が失われてゆくこの規制（そしてポップアップ）は今後どうなってゆくのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 要配慮個人情報を取得しているか？
- EU 域内ユーザー（そこに住む日本人も含め）にも利用されるサービスか？

## （３）他事業者からの第三者提供の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i3.png' />

個人情報保護法によれば、他事業者から提供される情報が

- 氏名や顔写真など特定の個人を識別できる情報
- 運転免許証番号などの個人識別符号

などの個人情報なのか、

- 性別、年齢、職業などの属性情報
- ウェブサイトの閲覧情報やウェブサイト上での検索、クリック、コンバージョンなどの情報

などの [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) なのかによって、やるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-2.png' />

改正個人情報保護法の施行（2022 年 4 月）以前は個人関連情報、例えばウェブサイトの閲覧情報を個人データとして取得する場合、ユーザー同意は不要でした。このとき、ユーザーは自身が関与できないところで 3rd-party Cookie 紐づけられたウェブサイトの閲覧情報によってスコアリングされ、スコア次第で社会的に不利な扱いを受けてしまうかもしれません（例えば [個人情報保護法に基づく勧告](https://www.ppc.go.jp/files/pdf/191204_houdou.pdf)）。こうした背景から表の右下にあるようにユーザー同意が必要になりました。

また、今後（３）や（６）のようなユースケースの増加を見込んでいる場合、ガバナンスの強化と効率化を目的として記録の内容、保持期間、そして開示請求への対応について標準化～仕組化することを検討してみましょう。余談ですが私も関連する社内プラットフォームの保守開発を担当しています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 閲覧、クリック、コンバージョン等の情報を個人データとして取得しているか？
- 記録を作成しているか？それは仕組化すべきか？

## （４）自社サービス活用における配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i4.png' />

ユーザーの権利利益を侵害しないため、加えてユーザー体験を悪化させないために配慮すべきことはいろいろとあります。

- 位置情報は慎重に扱う<br />（例えば病院や介護施設など、人がどこに所在するかという情報から個人の健康状態や思想信条などが推測できてしまう場合がある）
- その他センシティブな情報も慎重に扱う<br />（例えば要配慮個人情報や、経済状況、人間関係など）
- 適切な活用のタイミングを考える<br />（例えば閲覧後すぐに関連メールが届くとユーザーは気持ち悪さを感じてしまうかもしれない）
- 統計活用の場合は十分な N 数を担保する

それに加えて

- プラットフォーマーのルールを順守する
- ビジネスパートナーやクライアントとの個別契約を順守する

ことも必要です。例えば IDFA / GAID を活用する際には以下のルールを順守します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d3.png' />

さらに「安心安全」を守るために活用してはいけないデータ、例えばリファラやクエリパラメータから誤って混入してしまった個人情報や、本来削除されるべきだが削除されずに残ってしまった個人情報の検知について仕組化することを検討してみましょう（例えば [アナリストがデータ管理を自動化した話](https://techblog.lycorp.co.jp/ja/20231101a)）。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- ユーザーの権利利益や体験に配慮できているか？
- 他にも順守すべきルールはないか？
- 活用してはいけないデータはないか？

## （５）混ぜるな危険と AI 活用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i5.png' />

個人情報保護法によれば、委託提供の際のユーザー同意は不要です（[第三者に該当しない場合](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-3)）。ただし、委託提供された個人データは [委託された業務の範囲内](https://www.ppc.go.jp/all_faq_index/faq1-q7-38/) でしか扱えません。例えば、御社のホワイトペーパーに掲載された統計の元データ、この観点で問題ないでしょうか？

さらに、自社保有のデータと委託提供された個人データのユーザー単位の突合（[混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/)）も禁止されています。この場合、表の No.2 の整理でユーザーデータを活用した AI モデル登載のマルチテナント SaaS を提供することは不可、という結論になるのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d2.png' />

この点については

- サービスの規約に AI での価値提供も含めた委託提供が読み込めること
- サービスを利用するクライアントのプライバシーポリシーに記載された個人データ利用目的の範囲内であること
- 上記を前提として [個人情報保護法の FAQ 7-43](https://www.ppc.go.jp/all_faq_index/faq1-q7-43/) などを拠り所としてロジックを検討

… とご提案したいのは山々ですが、まずは社内外の専門家にご相談ください。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 委託された業務の範囲内か？
- 混ぜるな危険か？

## （６）他事業者への第三者提供の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i6.png' />

前述（３）と逆の立場で個人情報保護法観点の対応が必要になります。加えて、個人情報を第三者提供する場面では、優越的地位の濫用による強制力の高いユーザー同意の取得が問題視されることがあります。第三者提供がユーザーの権利利益に少なからず影響を与える場合、ユーザーに複数の選択肢を提示することも検討しましょう。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-3.png' />

ところで、最近データクリーンルームについて耳にすることが多くなりました。データクリーンルームとは端的には

- 所有者の異なるデータをマッチキーで突合する
- 突合結果に対しクロス集計などを通じてインサイトを得る
- ユーザー単位の情報は出力できず、統計値のみを出力する
- 差分プライバシー技術などを導入しプライバシーに配慮している

のようなソリューションです。例えば事業者Ａがアカウントに紐づくメールアドレスとアプリの課金額を持っていて、データクリーンルームを提供する事業者Ｂがメールアドレスとデモグラ情報を持っていたとします。事業者Ａはメールアドレスをマッチキーとしたデータクリーンルームを使うことで、デモグラに応じたアプリの課金傾向を把握し、広告出稿の方針を改善することができます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d4.png' />

なお、このケースで事業者Ａから事業者Ｂへの（もしくはその逆方向への）委託提供と整理した場合、クロス集計ゆえに [混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/) に抵触してしまいます。なのでユーザー同意のもと第三者提供と整理するか、混ぜるな危険に対するなにがしかの手当が必要となり、プライバシーに配慮したソリューションとはいえまだハードルも残っています。そこで LINE ヤフーではさらなる「安心安全のデータ活用」促進のため、[プライバシーテックの研究](https://research.lycorp.co.jp/jp/research_area/8) にも積極的に取り組んでいます。

その他（６）関連の補足です。

- 外部にユーザー識別子を第三者提供する場合、セクトラル型の識別子（例えば PPID = Pairwise Pseudonymous Identifier のような）を使うことで、外部での名寄せを防止するとともに、インシデント発生時には洗い替えすることもできます
- 利用者の利益に及ぼす影響が少なくない電気通信役務に対し、利用者に関する情報の内容や送信先について、当該利用者に確認の機会を付与する義務が生じます（[外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html#qa1-1)）。例えば LINE ヤフーでは [このように公表](https://privacy.lycorp.co.jp/ja/acquisition/thirdparties.html) しています。義務に対応するための調査や意図せぬ違反を回避するための手段として CSP の活用もご検討ください（記事中ほどの [他の事業者に対する情報送信調査への活用](https://techblog.yahoo.co.jp/entry/2023071830429434/) 参照）

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- ユーザーに複数の選択肢を提示すべきか？
- データクリーンルームを提供するか？
- 外部に提供する識別子は名寄せ可能か？
- 外部送信規律を気にすべきか？

## （７）越境アクセス対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i7.png' />

個人情報保護法によれば、国内の事業者への委託提供については（５）で述べた通りですが、一方で [海外の事業者に対する提供](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-4) については第三者に該当しない場合の定めがなく、委託提供であっても同意が必要とされています。関連する [データの取り扱いの問題](https://linecorp.com/ja/pr/news/ja/2021/3675) について、LINE ヤフーでは再発防止に努めています。

また、電気通信事業法の観点でも越境アクセスに対して [十分な安全管理措置](https://about.yahoo.co.jp/pr/release/2023/08/30b/) が求められており、LINE ヤフーではガバナンスのさらなる強化に取り組んでいます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 越境アクセスに対して必要な措置はとれているか？

## まとめ

いかがでしたでしょうか。この記事が少しでもみなさまの気付きにつながれば幸いです。

ところで LINE ヤフーでは「安心安全のデータ活用」を推進するための組織づくり、社内教育、プロセス構築、環境構築、仕組化などに取り組んでおります。興味をお持ちの方、同様の取り組みに携わっている方、是非情報交換させてください！
