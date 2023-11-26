# 安心安全のデータ活用

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや業務において、データを活用して課題を解決する機会は少なくないと思います。一方でユーザーデータの活用に際しては法律やパートナーとの契約を守ることに加えて、プライバシーへの配慮も重要です。また、取得したデータを個人データ化して活用する際には、データの取得方法によって対応すべきことが異なります。

そこで、今回は安心安全のデータ活用のために押さえておきたいポイントについて、表の（１）から（７）の順で述べたいと思います。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i0.png' />

蛇足ですが LINE ヤフーでは安心安全のデータ活用を推進するための体制や社内教育やプロセス、環境や仕組化によって、ここで挙げたことを含め広範で細やかなガバナンスを構築しています。興味をお持ちの方は是非お声がけください ^^

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i1.png' />

個人情報保護法では個人情報の取り扱いにあたり [どのデータを何の目的で活用するのかをユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) することが求められており、さらに [目的外の活用は不可](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) とされています。みなさまのサービスや業務においてこの点で問題がないことをご確認ください。

## （２）直接取得の際の同意

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i2.png' />

個人情報保護法では要配慮個人情報（人種、病歴、健康診断の結果、犯罪歴など）について、人権等の観点から取得時の [ユーザー同意が必要](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2) と定められています。みなさまのサービスや業務では要配慮個人情報を扱いますか？

また最近のサービスでは Cookie に関する同意ダイアログをしばしば見かけますが、

- サービス提供に必須となる Cookie（例えばログインセッションを管理する Cookie）の利用にはユーザー同意が不要
- マーケティング用語のトラッキング Cookie の利用にはユーザー同意が必要

ということが欧州の e-privacy 指令で定められています。みなさまのサービスが欧州ユーザー（欧州に住む日本人も含め）にも利用される場合、この点で問題がないことをご確認ください。

## 第三者提供（受領時）の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i3.png' />

個人情報を受領するのか、もしくは

- 性別、年齢、職業などの属性情報
- ウェブサイトの閲覧履歴
- 位置情報

などの [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) を受領するのか、それぞれの場合でやるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/d1-2.png' />

2022 年 4 月施行の改正個人情報保護法以前、Cookie に紐づけられたウェブサイトの閲覧履歴の授受に対する規制がなかったため、例えば学生の同意を得ることなく

1. 学生のウェブサイトの閲覧履歴を受領する
2. ウェブサイトの閲覧履歴から内定辞退の確率を予測する
3. その予測値を学生の氏名等個人を直接特定する情報と紐づけて保存する（= 個人データ化）
4. 企業に内定辞退の予測値を提供する

のようなサービスを提供することができてしまい、[そのような背景](https://www.ppc.go.jp/files/pdf/191204_houdou.pdf) から個人関連情報に関する対応が新たに必要となりました。みなさまのサービスは個人関連情報を個人データとして取得していますか？その場合は必要な対応はできていますか？

## 自社サービス活用における配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i4.png' />

以下はユーザーの権利利益を侵害しないために配慮すべきことの例です。

- 慎重な位置情報の扱い（例えば病院や介護施設など、人がどこに所在するかという情報から個人の健康状態や思想信条などが推測できてしまう場合がある）
- その他慎重に扱うべき情報（要配慮個人情報や、経済状況、人間関係など）
- 適切な活用のタイミング（例えば閲覧後すぐに関連メールが届くと多くのユーザーは心象を害するかもしれない）
- 社会的な優劣の評価にならない出力
- 統計活用における十分な N 数

それに加えて

- ビジネスパートナーやクライアントとの個別契約上問題はないか？
- プラットフォーマーのルールは守っているか？例えば Apple 規約には IDFA を使う際のルールが定められています

なども考慮する必要がありますが、みなさまのサービスや業務においては如何でしょうか？

## 委託提供と AI 活用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i5.png' />

まず、原則として委託先は委託元から提供された個人データを [委託された業務の範囲内](https://www.ppc.go.jp/all_faq_index/faq1-q7-38/) でしか扱えません。さらに「[混ぜるな危険](https://www.ppc.go.jp/all_faq_index/faq1-q7-41/)」と呼ばれる操作 … 自社保有のデータと提供された個人データの同意を伴わないユーザー単位の突合 … も禁止されています。

となると、みなさまが AI モデルを活用したマルチテナント SaaS を提供する場合、表の No.2 のような整理はできないという結論になるのでしょうか？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/d2.png' />

この点については

- サービスの規約に AI での価値提供も含めた委託提供が読み込めること
- サービスを利用するクライアントのプライバシーポリシーに記載された個人データ利用目的の範囲内であること
- 上記を前提に [個人情報保護法の FAQ](https://www.ppc.go.jp/all_faq_index/faq1-q7-43/) などを拠り所としてロジックを検討

としつつ外部の専門家にご相談頂く必要があります。

## 第三者提供（提供時）の際の同意や法律対応

- クリーンルーム

- 外部での名寄せによるリスクはないか（PPID）

- 選択肢の提示
-- 第三者提供の場面などでは、優越的地位の濫用による強制同意（サービス活用するためには絶対に同意をしないと進めない）の文脈で問題になることはある


<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i6.png' />

- 個人データは第三者提供同意なくさらに提供をすることはできない
- それが受領したデータの場合、受領者側での同意が難しい場合提供者側での（代理での）同意を検討する

- 外部送信規律
- 利用者の利益に及ぼす影響が少なくない電気通信役務に対して義務が生じる
-- https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html#qa1-1
-- 利用者に関する情報の内容や送信先について、当該利用者に確認の機会を付与する義務
-- このような HOW も参考に
-- https://techblog.yahoo.co.jp/entry/2023071830429434/
-- ヤフーの記載
-- https://privacy.lycorp.co.jp/ja/acquisition/thirdparties.html

## 越境アクセス対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i7.png' />

- 海外への委託提供における留意（個情法観点）
-- https://www.ppc.go.jp/files/pdf/2305_APPI_QA.pdf の #12-1 委託提供であっても、外国にある第三者への提供の場合には本人の同意が必要
-- LINE の朝日報道
-- 第三者提供は 27 条 1 項で同意取得が求められている
-- 一方で委託については 27 条 5 項で第三者への提供に該当しないとされている（ので同意は不要とされている）
-- https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-3
-- 外国の第三者への提供は上記と別に 28 条の規制にもかかる
-- https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-6-4
-- こちらのケースは 27 条 5 項的な「委託の場合は第三者に該当しない」という定めがなく、結果として委託であっても同意が必要
- 電気通信事業者法観点
-- 2023 年ヤフーへの行政指導

特定社会基盤事業者の指定
https://www.soumu.go.jp/main_content/000912870.pdf


