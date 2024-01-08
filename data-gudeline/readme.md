# 安心安全のデータ活用

- 表や見出しの文言見直し
- https://www.ppc.go.jp/all_faq_index/faq2-q2-3/

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや社内業務において、データを活用して課題を解決する機会は少なくないと思います。一方でデータの扱いに際しては法律やパートナーとの契約を遵守することに加えて、プライバシーへの配慮もかかせません。そこで今回は「安心安全のデータ活用」のため、データの取得方法に応じた留意点についてまとめてみました。

各章ごとにチェックポイントを設けたので、みなさまのデータ活用に照らし合わせてみてください。

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i1.png' />

ユーザーがフォームに入力したデータやトラッキングログを個人データ化する際の留意点として、個人情報保護法では何のデータをどのような目的で活用するのか [具体的に特定](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) して [ユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-3) することを求めており、目的外の活用 … 例えばサービスに関する連絡にしか利用しない、と約束したメールアドレスを広告のオーディエンス連携や look a like 拡張に使うなど … は [不可](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) とされています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/check-point.png' />
- 利用規約やプライバシーポリシー等で目的を説明してるか？
- 目的は具体的に特定されているか？
- 目的外の利用はないか？

## （２）直接取得の際の同意

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i2.png' />

個人情報保護法では要配慮個人情報（人種、病歴、健康診断の結果、犯罪歴など）について、人権等の観点から取得時の [ユーザー同意が必要](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2) と定められています。みなさまのサービスや業務では要配慮個人情報を扱いますか？

また最近のサービスでは Cookie に関する同意ダイアログをしばしば見かけますが、

- サービス提供に必須となる Cookie（例えばログインセッションを管理する Cookie）の利用にはユーザー同意が不要
- マーケティング用途のトラッキング Cookie の利用にはユーザー同意が必要

ということが欧州の e-privacy 指令で定められています。みなさまのサービスが欧州ユーザー（欧州に住む日本人も含め）にも利用される場合、この点で問題がないことをご確認ください。

★https://ln.hixie.ch/?start=1700627373&count=1
★https://gigazine.net/news/20231127-ian-hickson-reflecting-18-years-google/

one of the most annoying is the prevalence of pointless cookie warnings we have to wade through today

なんて意見もありますが。


## （３）第三者提供（受領時）の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/i3.png' />

個人情報を受領するのか、もしくは

- 性別、年齢、職業などの属性情報
- ウェブサイトの閲覧情報（例えば閲覧イベントのビーコンなども）
- 位置情報

などの [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) を受領するのか、それぞれの場合でやるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/img/d1-2.png' />

改正個人情報保護法が 2022 年 4 月に施行されましたが、それ以前は Cookie に紐づけられたウェブサイトの閲覧履歴の授受に対する規制はありませんでした。

そのような状況下では、例えば学生の同意を得ることなく（つまり学生の知らないところで）

1. 学生のウェブサイトの閲覧情報を受領する
2. ウェブサイトの閲覧履歴から内定辞退の確率を予測する
3. その予測値を学生を直接特定する情報と紐づけて保存する（= 個人データ化）
4. クライアント企業に内定辞退の予測値を提供する

のようなサービスを [提供することができてしまい](https://www.ppc.go.jp/files/pdf/191204_houdou.pdf) ました。

こうした背景から個人関連情報に関する対応が新たに必要となりましたが、みなさまのサービスでは個人関連情報の受領の際に必要な対応はできていますか？

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

