# そのデータ活用、もういちどチェック！

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや社内業務において、データを活用して課題を解決する機会は少なくないと思います。一方で個人データを取り扱う際には法律やパートナーとの契約を順守することに加えて、プライバシーへの配慮もかかせません。そこで今回は「安心安全のデータ活用」のための留意点についてまとめてみました。各章ごとに設けた「Check !」の項目について、データ活用におけるレビュー観点として参考にしていただれば幸いです。

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i1.png' />

個人情報保護法によれば、直接取得した情報（例えばユーザーがフォームに入力した情報やトラッキングログなど）を個人データ化する際、何の情報をどのような目的で活用するのか [具体的に特定](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) し [ユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-3) することが必要になります。加えて目的外の活用は [できません](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) 。例えば問い合わせ対応を目的して取得したメールアドレスを、広告のオーディエンス連携や類似拡張に活用することはできません。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 規約やプライバシーポリシーなどで目的を説明してるか？
- 目的は具体的に特定されているか？
- 目的外の活用はないか？

## （２）直接取得の際の同意

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

個人情報保護法によれば、他事業者から個人データが提供されるのか

- 位置情報
- ウェブサイトで発生したイベント情報<br />（例えば閲覧、検索、クリック、コンバージョンなど）

のような [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) が提供され、それを受領側でそれを個人データ化するのかでやるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-2.png' />

改正個人情報保護法の施行（2022 年 4 月）以前は個人関連情報、例えばウェブサイトの閲覧情報を個人データとして取得する場合、ユーザー同意は不要でした。このとき、ユーザーは自身が関与できないところで 3rd-party Cookie 紐づけられたウェブサイトの閲覧情報によってスコアリングされ、スコア次第で社会的に不利な扱いを受けてしまうかもしれません（例えば [個人情報保護法に基づく勧告](https://www.ppc.go.jp/files/pdf/191204_houdou.pdf)）。こうした背景からユーザー同意（表の右下）が必要になりました。

また、今後（３）や（６）のようなユースケースの増加を見込んでいる場合、ガバナンスの強化と効率化を目的として記録の内容、保持期間、そして開示請求への対応について標準化～仕組化することを検討してみましょう。余談ですが私も関連する社内プラットフォームの保守開発を担当しています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 閲覧、クリック、コンバージョン等の情報を個人データとして取得しているか？
- 記録を作成しているか？それは仕組化すべきか？

## （４）自社でデータ活用する場合の配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i4.png' />

ユーザーの権利利益を侵害しないため、加えてユーザー体験を悪化させないために配慮すべきことはいろいろとあります。

- 位置情報は慎重に扱う<br />（例えば病院や介護施設など、人がどこに所在するかという情報から個人の健康状態や思想信条などが推測できてしまう場合がある）
- その他センシティブな情報も慎重に扱う<br />（例えば要配慮個人情報や、経済状況、人間関係など）
- 適切な活用のタイミングを考える<br />（例えば閲覧後すぐに関連メールが届くとユーザーは気持ち悪さを感じてしまうかもしれない）
- 統計活用の場合は十分な N 数を担保する

加えて、例えば IDFA / GAID の利用には

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d3.png' />

のようなルールがありますが

- プラットフォーマーのルール
- ビジネスパートナーやクライアントとの個別契約

からの逸脱や、前述（１）の目的外利用を防止するためのデータの分類や管理方法が必要になります。さらに、例えばリファラやクエリパラメータから誤って混入してしまった個人情報や、本来削除されるべきだが削除されずに残ってしまった個人情報の検知の仕組化についても検討してみましょう（例えば [アナリストがデータ管理を自動化した話](https://techblog.lycorp.co.jp/ja/20231101a)）。

サービスの現場における [データマネージャーが事業部のデータガバナンス意識改善に取り組んだお話](https://techblog.lycorp.co.jp/ja/20240123a) もご参考まで。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- ユーザーの権利利益や体験に配慮できているか？
- 他にも順守すべきルールはないか？
- 逸脱や削除漏れの可能性はないか？
- 現場の意識改善は必要か？

## （５）委託提供と AI 活用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i5.png' />

個人情報保護法によれば、委託提供の際のユーザー同意は不要です（[第三者に該当しない場合](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-3)）。ただし、委託提供された個人データは [委託された業務の範囲内](https://www.ppc.go.jp/all_faq_index/faq1-q7-38/) でしか扱えません。例えば、営業組織が活用しているホワイトペーパー、掲載された統計の元データはこの観点で問題ないでしょうか？

さらに AI モデル登載のマルチテナント SaaS を提供する場合、課題解決力は高く、クライアントの負担は少なく、黄色のセルのように整理できれば理想的です。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d2.png' />

この点については

- サービスの規約に AI での価値提供も含めた委託提供が読み込めること
- サービスを利用するクライアントのプライバシーポリシーに記載された個人データ利用目的の範囲内であること
- 上記を前提として [個人情報保護法の FAQ 7-43](https://www.ppc.go.jp/all_faq_index/faq1-q7-43/) などを拠り所としてロジックを検討

のような提案をしたいのは山々ですが、まずは社内外の専門家にご相談ください。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 委託された業務の範囲内か？
- 混ぜるな危険か？

## （６）他事業者にデータが渡る場合の対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i6.png' />

個人データ、もしくは個人関連情報を第三者提供する場合、個人情報保護法観点で前述（３）と逆の立場での対応が必要になります。また、個人データを第三者提供する場面において、優越的地位の濫用による強制力の高いユーザー同意が問題視されることがあります。第三者提供がユーザーの権利利益に少なからず影響を与える場合、ユーザーに対して複数の選択肢を提示することも検討しましょう。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-3.png' />

ところで、最近データクリーンルームについて耳にすることが多くなりました。データクリーンルームとは端的には

- 所有者の異なるデータをマッチキーで突合する
- 突合結果に対しクロス集計などを通じてインサイトを得る
- ユーザー単位の情報は出力できず、統計値のみを出力する
- 差分プライバシー技術などを導入しプライバシーに配慮している

のようなソリューションです。例えば事業者Ａがアカウントに紐づくメールアドレスとアプリの課金額を持っていて、データクリーンルームを提供する事業者Ｂがメールアドレスとデモグラ情報を持っていたとします。事業者Ａはメールアドレスをマッチキーとしたデータクリーンルームを使うことで、デモグラに応じたアプリの課金傾向を把握し、広告出稿の方針を改善することができます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d4.png' />

なお、このケースで事業者Ａから事業者Ｂへの（もしくはその逆方向への）個人データの委託提供と整理した場合、クロス集計ゆえに [混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/) に抵触してしまいます。なのでユーザー同意にもとづく第三者提供、といった整理も検討が必要であり、プライバシーに配慮したソリューションとはいえまだハードルも残っています。LINE ヤフーではこうしたハードルの解消も含め、さらなる「安心安全のデータ活用」を促進するのため、[プライバシーテックの研究](https://research.lycorp.co.jp/jp/research_area/8) にも積極的に取り組み、実際にサービスに [適用している事例](https://privacy.lycorp.co.jp/ja/acquisition/privacy_techs.html) もあります。

その他（６）関連の補足です。

- 外部にユーザー識別子を第三者提供する場合、セクトラル型の識別子（例えば PPID = Pairwise Pseudonymous Identifier のような）を使うことで、外部での名寄せを防止するとともに、漏洩などのインシデント発生時には識別子の洗い替えが可能になります
- [外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html#qa1-1) の施行（2023 年 6 月）により、利用者の利益に及ぼす影響が少なくない電気通信役務に対し、利用者に関する情報の内容や送信先について、当該利用者に確認の機会を付与する義務が生じました。例えば LINE ヤフーでは [このように公表](https://privacy.lycorp.co.jp/ja/acquisition/thirdparties.html) しています。外部送信規律に対応するための調査や意図せぬ違反を回避するための手段として CSP の活用もご検討ください（記事中ほどの [他の事業者に対する情報送信調査への活用](https://techblog.yahoo.co.jp/entry/2023071830429434/) 参照）

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- ユーザーに複数の選択肢を提示すべきか？
- データクリーンルームを利用もしくは提供予定か？
- 外部に提供する識別子は名寄せ可能か？
- 外部送信規律を気にしているか？

## （７）越境アクセスに関する対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i7.png' />

最後に私たち（LINE ヤフー）の事例を 2 つご紹介しますので、他山の石としてください。

個人情報保護法によれば、国内の事業者への委託提供については（５）で述べた通りですが、一方で [海外の事業者に対する提供](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-4) については第三者に該当しない場合の定めがなく、一部の国を除いて委託提供であっても同意が必要とされています。このような [データの取り扱いの問題](https://linecorp.com/ja/pr/news/ja/2021/3675) について、私たちとしても再発防止に努めています。

また、電気通信事業法の観点でも越境アクセスに対して [十分な安全管理措置](https://about.yahoo.co.jp/pr/release/2023/08/30b/) が求められており、これを踏まえさらなるガバナンスの強化に取り組んでいます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 越境アクセスに対して適切な対応はとれているか？

## おわりに

いかがでしたでしょうか。この記事が少しでもお役に立てれば幸いです。蛇足になりますが、グローバルな多言語の協業体制の場合、この記事で用いたレベルの用語（例えば個人情報保護法 = Act on the Protection of Personal Information など）については英訳をチーム内で共有しておくこともおすすめです。

ところで LINE ヤフーでは「安心安全のデータ活用」を推進するための組織づくり、社内教育、プロセス構築、環境構築、仕組化、プライバシーテックの研究などに取り組んでおります。興味をお持ちの方、同様の取り組みに携わっている方、是非情報交換させてください！
