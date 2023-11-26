# 安心安全のデータ活用

こんにちは、プラットフォームエンジニアの中山です。

みなさまのサービスや業務において、データを活用して課題を解決する機会は少なくないと思います。一方でユーザーデータの活用に際しては法律やパートナーとの契約を守ることに加えて、プライバシーへの配慮も重要です。また、取得したデータを個人データ化して活用する際には、データの取得方法によって対応すべきことが異なります。

そこで、今回は安心安全のデータ活用のために押さえておきたいポイントについて、表の（１）から（７）の順で述べたいと思います。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i0.png' />

蛇足ですが LINE ヤフーでは安心安全のデータ活用を推進するための体制や社内教育やプロセス、環境や仕組化によって、ここで挙げたことを含め広範で細やかなガバナンスを構築しています。興味をお持ちの方は是非お声がけください ^^

## （１）直接取得の際の目的説明

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i1.png' />

個人情報保護法では個人情報の取り扱いにあたり [どのデータを何の目的で活用するのかをユーザーに説明](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) することが求められており、さらに [目的外の利用は不可](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3) とされています。みなさまのサービスや業務においてこの点で問題がないことをご確認ください。

## （２）直接取得の際の同意

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i2.png' />

個人情報保護法では要配慮個人情報（人種、病歴、健康診断の結果、犯罪歴など）について、人権等の観点から取得時の [ユーザー同意が必要](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2) と定められています（通常の個人情報については定められていません）。みなさまのサービスや業務では要配慮個人情報を扱いますか？

また最近のサービスでは Cookie に関する同意ダイアログをしばしば見かけますが、

- サービス提供に必須となる Cookie（例えばログインセッションを管理する Cookie）の利用にはユーザー同意が不要
- マーケティング用語のトラッキング Cookie の利用にはユーザー同意が必要

ということが欧州の e-privacy 指令で定められています。みなさまのサービスが欧州ユーザー（欧州に住む日本人も含め）にも利用される場合、この点で問題がないことをご確認ください。

## 第三者提供（受領時）の際の同意や法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i3.png' />

個人情報を受領するのか、

- 性別
- 年齢
- 職業
- ウェブサイトの閲覧履歴
- 位置情報

などの [個人関連情報](https://www.ppc.go.jp/all_faq_index/faq2-q2-8/) を受領するのか、それぞれの場合でやるべきことが異なります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/d1-2.png' />

2022 年 4 月施行の改正個人情報保護法以前、Cookie に紐づけられたウェブサイトの閲覧履歴の授受に対する規制がなかったため、学生の同意を得ることなく

1. 学生のウェブサイトの閲覧履歴を受領する
2. ウェブサイトの閲覧履歴から内定辞退の確率を予測する
3. その予測値を学生の氏名等個人を直接特定する情報と紐づけて保存する（= 個人データ化）
4. 企業に内定辞退の予測値を提供する

のようなサービスを提供することができてしまい、そのような背景から個人関連情報に関する対応が新たに必要となりました。みなさまのサービスは個人関連情報を個人データとして取得していますか？その場合は必要な対応はできていますか？

## 自社サービス利用における配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i4.png' />

（プライバシー配慮）

慎重に扱う べきデータを含んでいるか
ex. 性的指向、宗教、信条、人種、民族、経済的貧困、犯罪歴、病気、人間関係
位置情報の扱いに配慮しているか
※ 人がどこに所在するかということ自体で、個人の健康状態や思想信条などまで 推測できる場合がある（ex. 介護施設、風俗店）
法的に守るべきことはないか（ex. 13 歳未満、薬機法制限）
社会的な優劣 をつける使い方になっていないか
データの利用タイミングや頻度に問題はないか？（ex. 例えば検索や 閲覧後すぐ に関連したメールを送信した場合の心象）

その他勘案点
本人のメリットは何か
ユーザーの予測できない用途か否か
ユーザーにとっての気持ち悪さはないか
名寄せによるリスクはないか
N 数 により個を特定するリスクはないか

（ビジネス配慮、規約遵守）

パートナーやクライアントとの 個別契約 上問題はないか
ビジネスの 仁義や商習慣 上問題はないか（ex. 楽天の PV を Amazon のリタゲに使う）
プラットフォーマー のルールは守っているか（ex. Apple 規約、Google 規約）



## 委託提供と AI 利用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/i5.png' />

- 20231023-data-guideline.pptx 参照
- 以前の外部弁護士との整理も確認

## 第三者提供（提供時）の際の同意や法律対応


- 選択肢の提示
-- 第三者提供の場面などでは、優越的地位の濫用による強制同意（サービス利用するためには絶対に同意をしないと進めない）の文脈で問題になることはある


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


