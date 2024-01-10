# そのデータ活用、ダウト！

/*

ToDo :

- 文言見直し : 本人 vs ユーザー
- 文言見直し : 情報 vs データ
- 文言見直し : 利用 vs 活用
- 表や見出しの文言見直し
- 仕組に言及 : 個人情報を消す対応
- 仕組に言及 : 混入検知の方法
- CBPR とれば越境の委託でも同意不要になる？
- 当初記載していた LY ではいろいろやってるよ的な文言
- https://www.ppc.go.jp/all_faq_index/faq2-q2-3/

*/

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや社内業務において、データを活用して課題を解決する機会は少なくないと思います。一方でデータの扱いに際しては法律やパートナーとの契約を遵守することに加えて、プライバシーへの配慮もかかせません。そこで今回は「安心安全のデータ活用」のため、データの取得方法に応じた留意点についてまとめてみました。

各章ごとに設けた「スクリーニング」を、みなさまのデータ活用に照らし合わせてご活用ください。

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i1.png' />

直接取得 … 例えばユーザーがフォームに入力したデータやトラッキングログを個人データ化する際、個人情報保護法では何のデータをどのような目的で活用するのか [具体的に特定](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) して [ユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-3) することが求められています。加えて、目的外の用途 … 例えばサービスに関する連絡にのみ活用、と説明して取得したメールアドレスを広告のオーディエンス連携や類似拡張に [使ってはならない](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) とされてます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 規約やプライバシーポリシーなどで目的を説明してるか？
- 目的は具体的に特定されているか？
- 目的外の活用はないか？

## （２）直接取得の際の同意取得

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i2.png' />

要配慮個人情報（人種、病歴、健康診断の結果、犯罪歴など）を直接取得して個人データ化する際、個人情報保護法では人権等の観点から [ユーザーの同意](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2) が求められています。とはいえ、入力フォーム等で適正に直接取得する限りにおいては、改めての同意ポップアップは不要です。

一方で、要配慮個人情報ならずとも最近のサービスで Cookie に関する同意ポップアップに遭遇する機会が増えましたが、その背景にあるのは EU の ePrivacy Regulation における Cookie 規制です。

- マーケティング用途のトラッキング Cookie の利用にはユーザー同意が必要
- ただしサービス提供に必須（例えばログインセッションの管理）となる Cookie の利用にはユーザー同意は不要

しかし、この同意ポップアップについてはプライバシー保護の観点で実効性を疑う意見もあります（例えば [Reflecting on 18 years at Google](https://ln.hixie.ch/?start=1700627373#:~:text=one%20of%20the%20most%20annoying%20is%20the%20prevalence%20of%20pointless%20cookie%20warnings%20we%20have%20to%20wade%20through%20today)）。

> one of the most annoying is the prevalence of pointless cookie warnings we have to wade through today

Safari の 3rd-party Cookie は既に廃止され、Firefox はドメインごとに Cookie を分離して管理するため 3rd-party Cookie による名寄せができません。そして今年は Chrome の 3rd-party Cookie が [段階的に廃止](https://japan.googleblog.com/2023/12/chrome-cookie.html) されます。ますます実効性が失われてゆくこの規制（そしてポップアップ）は今後どうなるのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- 要配慮個人情報を取得しているか？
- EU 域内ユーザー（そこに住む日本人も含め）に利用されるサービスか？

## （３）他事業者からの第三者提供の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i3.png' />

他事業者から提供される情報が

- 氏名や顔写真など特定の個人を識別できる情報
- 運転免許証番号などの個人識別符号

などの個人情報なのか、

- 位置情報
- 性別、年齢、職業などの属性情報
- ウェブサイトの閲覧情報やウェブサイト上での検索、クリック、購買などの情報

などの [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) なのかによって、やるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-2.png' />

受領側が個人関連情報を個人データとして取得する場合、ユーザー同意の取得が必要になる点（表の右下）に着目してください。改正個人情報保護法の施行（2022 年 4 月）以前は、個人関連情報 … 例えばウェブサイトの閲覧情報の授受に関する規制はありませんでした。この場合、ユーザーは自身の知らないところで 3rd-party Cookie 紐づけられたウェブサイトの閲覧履歴によってスコアリングされ、スコア次第で社会的に不利な扱いを受けてしまう、といった事案が発生するかもしれません（[参考事案](https://www.ppc.go.jp/files/pdf/191204_houdou.pdf)）。

こうした背景から個人関連情報を個人データとして取得する際にはユーザー同意の取得が必要になりました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />

- ウェブサイトの閲覧情報等を個人データとして取得しているか？
- 記録を作成しているか？

## （４）自社サービス活用における配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i4.png' />

以下はユーザーの権利利益を侵害しないために配慮すべきことの例です。

- 慎重な位置情報の扱い（例えば病院や介護施設など、人がどこに所在するかという情報から個人の健康状態や思想信条などが推測できてしまう場合がある）
- その他慎重に扱うべき情報（要配慮個人情報や、経済状況、人間関係など）
- 適切な活用のタイミング（例えば閲覧後すぐに関連メールが届くと多くのユーザーは心象を害するかもしれない）
- 社会的な優劣の評価にならない出力
- 統計活用における十分な N 数の担保

それに加えて

- ビジネスパートナーやクライアントとの個別契約上問題はないか？
- プラットフォーマーのルールは守っているか？例えば Apple 規約には IDFA を使う際のルールが定められています

なども考慮する必要がありますが、みなさまのサービスや業務においては如何でしょうか？

★混入ケースなどをここで

## （５）委託提供と AI 活用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i5.png' />

まず、原則として委託先は委託元から提供された個人データを [委託された業務の範囲内](https://www.ppc.go.jp/all_faq_index/faq1-q7-38/) でしか扱えません。さらに「[混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/)」と呼ばれる操作 … 自社保有のデータと提供された個人データの同意を伴わないユーザー単位の突合 … も禁止されています。

となると、ユーザーデータを活用した AI モデル登載のマルチテナント SaaS を提供する場合、表の No.2 の整理は難しいという結論になるのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d2.png' />

この点については

- サービスの規約に AI での価値提供も含めた委託提供が読み込めること
- サービスを利用するクライアントのプライバシーポリシーに記載された個人データ利用目的の範囲内であること
- 上記を前提に [個人情報保護法の FAQ 7-43](https://www.ppc.go.jp/all_faq_index/faq1-q7-43/) などを拠り所としてロジックを検討

… と提案したいところですが、まずは外部の専門家にご相談頂くべきかと思います。

## （６）第三者提供（提供時）の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i6.png' />

前述（３）と逆の立場での対応です。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-3.png' />

何点か補足します。

- 個人情報を第三者提供する場面において、優越的地位の濫用による強制力の高いユーザー同意の取得が問題視されることがあります。第三者提供によるユーザーの権利利益の侵害の懸念がある場合、ユーザーに複数の選択肢を提示することも要検討です。
- 最近よく耳にするクリーンルームは、所有者の異なるデータのクロス集計を通じてインサイトを得るためのソリューションです。差分プライバシー技術なども導入しプライバシーに配慮しているとはいえ、クロス集計故に [混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/) に抵触してしまいます。なので第三者提供と整理した上で同意を取得するか、委託提供と整理した上でクロス集計に対するなにがしかの手当が必要になります。蛇足ですが LINE ヤフーでは [プライバシーテックの研究を進め](https://enterprisezine.jp/news/detail/18737) ユーザーのプライバシーを守りつつクリーンルームの利用ハードルを下げるための取り組みも進めています。
- 第三者提供や委託提供を問わず、外部に識別子を提供する場合はセクトラル型の識別子（例えば Pairwise Pseudonymous Identifier のような）を使うことで、外部での名寄せを防止しユーザーのプライバシーを守ることにつながります
- 利用者の利益に及ぼす影響が少なくない電気通信役務に対し、利用者に関する情報の内容や送信先について、当該利用者に確認の機会を付与する義務が生じます（[外部送信規律](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html#qa1-1)）。例えば LINE ヤフーでは [このように公表](https://privacy.lycorp.co.jp/ja/acquisition/thirdparties.html) しています。義務に対応するための調査や意図せぬ違反を回避するための手段として [Content Security Policy の活用](https://techblog.yahoo.co.jp/entry/2023071830429434/) もご検討ください


★★
突合同意は、4. パーソナルデータの利用目的の以下箇所だと思います！
また、パートナーからのメッセージ送信や広告配信、広告の効果測定、統計情報の作成・提供など、「4.パーソナルデータの利用目的」に記載された目的で、パートナーからお客様に関する情報を取得し、当社の保有する情報と組み合わせて利用することがあります。
パートナーから取得する情報としては、識別子（内部識別子、広告識別子など）、ハッシュ化されたメールアドレスや電話番号、IPアドレス、機器情報の一部（OSなど）、属性情報ならびに購買履歴、視聴履歴、検索履歴および位置情報を含むお客様に関する行動履歴などがあります。


★★
個人データの第三者提供を受ける場合の確認義務：
https://www.ppc.go.jp/personalinfo/legal/guidelines_thirdparty/#a3 
→こちらの3-1-1から3-1-2にあるとおり、提供元の法人の代表者の氏名等も確認する必要があります。

「等」も入れる

## （７）越境アクセス対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i7.png' />

国内の事業者に対する第三者提供にはユーザー同意の取得が必要なことは上で述べた通りですが、委託提供など [第三者に該当しない場合の定め](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-3) があり、その場合はユーザー同意は不要とされています。一方で [海外の事業者に対する提供](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-4) については第三者に該当しない場合の定めはなく、委託提供であっても同意が必要とされています。

- LINE の朝日報道

電気通信事業法
特定社会基盤事業者の指定
https://www.soumu.go.jp/main_content/000912870.pdf

- 2023 年ヤフーへの行政指導
- https://www.soumu.go.jp/menu_news/s-news/01kiban18_01000203.html

## まとめ

その他いろいろな取り組みへの参照
- https://techblog.yahoo.co.jp/entry/2022052530303179/
- https://techblog.lycorp.co.jp/ja/20231101a
混入の検知

