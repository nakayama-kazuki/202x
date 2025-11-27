# `power-on-off-check`

実行ディレクトリにある skysea ログ仕様の csv 形式ファイルを読み込み電源 ON 状態を維持している日数や、電源 OFF を実行する頻度をテキストファイルに書き出します。

## 入力データ

### ファイル名

 *.csv

### ファイル形式

| 索引 | カラムの番目 | 内容 |
| ---- | ---- | ---- |
| 0 | 1 | 端末番号（ログイン名が空の場合に利用） |
| 4 | 5 | ログイン名 |
| 6 | 7 | イベント発生日 |
| 11 | 12 | イベント内容 |

## 出力データ

### ファイル名

 result.txt

### 出力形式

 login=hoge.jiro, until=5, rate-total=0.761904761904762(16/21), rate-recent=0.666666666666667(6/9)
 login=hoge.taro, until=21, rate-total=0.25(1/4), rate-recent=0(0/2)
 login=dummy, until=(the date before 04/01/2025 00:00:00), rate-total=0(0/1), rate-recent=0(0/1)
 terminal=1111, until=(the date before 04/01/2025 00:00:00), rate-total=0(0/1), rate-recent=0(0/1)

| 項目 | 内容 |
| ---- | ---- |
| login | ログイン名 |
| terminal | 端末番号（ログイン名が空の場合に利用） |
| until | 電源 OFF にしていない日数（集計期間中 0 日の場合はそれがいつから続いているか） |
| rate-tota | 電源 OFF にしている割合 |
| rate-recent | 電源 OFF にしている割合（直近 $agoDays 以内で） |

