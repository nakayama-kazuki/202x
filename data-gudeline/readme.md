# 安心安全のデータ活用

こんにちは、プラットフォームエンジニアの中山です。

## どのようなもの？

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/0.png' />

## 目的説明や選択肢の提示

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/1.png' />

- 個人情報の取り扱いにあたっては [利用目的を特定](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-1) する
- その [目的外では利用できません](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-1-3)

## ユーザー同意の取得と受領時の法律対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/2-1.png' />

- 背景説明（リクナビ）
- 必要な同意
- 必要な法律対応
- 選択肢の提示
-- 第三者提供の場面などでは、優越的地位の濫用による強制同意（サービス利用するためには絶対に同意をしないと進めない）の文脈で問題になることはある

- これって第三者提供？直接取得？
-- 同意は要配慮個人情報（人種、信条、社会的身分、病歴、犯罪の経歴、犯罪により害を被った事実などをいいます）の取得の際にのみ必要
-- 20 条 2 項 : https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/#a3-3-2

## 最近よく見る Cookie 同意

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/3.png' />

- https://businessandlaw.jp/articles/a20230228-1/
- 個情法では直接取得の同意は必須ではない
- GDPR では Cookie を利用した（個情法で言うところの）直接取得、例えばユーザーの行動履歴の取得は同意が必要
-- 蛇足だがログインセッション Cookie のようなもの（記事では「ネセサリーCookie」と表現）は同意不要
- 個情法では↑ではないが、世の同意管理サービスは↑の世界観にあわせて構築されているため昨今よく Cookie 同意を見かけるようになった

## 他事業者への第三者提供時の各種対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/2-2.png' />

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

## 自社サービス利用における配慮

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/4.png' />

- 20231023-data-guideline.pptx 参照

## 委託提供と AI 利用

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/5.png' />

- 20231023-data-guideline.pptx 参照
- 以前の外部弁護士との整理も確認

## 越境アクセス対応

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/data-gudeline/6.png' />

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
