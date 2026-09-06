# 今日、生成 AI は良い仕事をした。では、明日は？

こんにちは、エンジニアの中山です。

以前 Google の AI Overview で、ピザに接着剤を使うアドバイスが掲出されて話題になりましたが、皆さんは生成 AI の出力品質にどのように向き合ってますか？

- 肥大化するプロンプトをリファクタリングしたいけど、悪影響が心配だ
- モデルのアップグレード後、秘伝のタレ（トリッキーな指示）がこれまでと同様に機能するだろうか
- 生成パイプラインの改善は一見成功しているようだけど、エッジケースで副作用を生まないだろうか

このような悩みを抱えている開発現場も多いのではないでしょうか。

私の担当するサービスでも、生成 AI を活用してニュース記事や SNS ポストのブリーフィングを自動生成したい、というニーズがありました。

そこで、この記事ではブリーフィングの自動生成を題材に、生成 AI の出力品質をどのように継続的に評価したのか、についてご紹介したいと思います。

# 評価プロセス全体像

最初に評価プロセス全体像を示します。プロセスに登場するのは人間（緑）と評価ロボット（青）と生成パイプライン（赤）です。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. 熟練編集者に「よいブリーフィング」の具体例を複数件作ってもらう
2. 上記 1 を参考にしつつ、熟練編集者に「よいブリーフィング」たる品質を定義してもらう
3. 上記 2 に基づいてブリーフィングをスコアリングする評価ロボットを作る
4. 検証のために、評価ロボットに上記 1 を評価させてみる
5. 上記 4 の結果、低評価になる場合は上記 1 の具体例か上記 2 の定義の一方、もしくは両方を調整する

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

6. 初期バージョンのブリーフィング生成パイプラインを作る
7. 生成～評価のバッチ処理
	- 十分な件数の入力データセットからブリーフィングを生成する
	- 評価ロボットがブリーフィングをスコアリング
8. 評価に基づき生成パイプラインを改善し、それを次世代バージョンとする
9. 上記 7, 8 を繰り返す

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

10. 熟練編集者のチェックにより最終的なデプロイ判定を実施
11. 将来モデルの変更やブリーフィングの仕様変更（例えばパーソナライズ強化）が生じた場合、その内容に応じてプロセスを繰り返す

このプロセスの狙いは、評価ロボットで評価の量を担保しつつ、熟練編集者は人間だからこそ気付くことのできるリスクの精査にフォーカスすることで、評価の費用対効果を最大化することです。

今回 <a href='https://deepeval.com/'>DeepEval</a> を利用して評価ロボットを含めたプロセス支援のフレームワークを実装しましたが、運用を通じて様々な課題が発生しました。

ここからは発生した課題とその対策について掘り下げていきます。

# よいブリーフィングとはなにか？

唐突ですが、架空の記事 …

```
宇宙航空研究開発機構（JAXA）をはじめとする国際宇宙探査チームは7日、月面南部にて建設を進めていた人類初の常設月面基地「アルテミス・ベース」の初期建設プロセスがすべて完了したと発表した。2020年代に始まった国際共同月探査プロジェクトの中核を担うこの基地の完成により、人類が月面に長期間滞在し、持続的な科学研究や開発を行うための基盤が整った。完成した月面基地は、居住モジュール、太陽光発電システム、そして月面の水資源から水素と酸素を抽出する実験プラントなどで構成されている。今後は、世界各国から選抜された最大6名の宇宙飛行士が数ヶ月交代で常駐し、低重力環境が人体に与える影響の調査や、月面での天体観測、資源採掘の技術実証を行う予定だ。さらに、この月面基地は将来の有人火星探査に向けた「中継拠点」としての役割も期待されている。地球よりも重力が小さい月面からのロケット打ち上げは、地球から直接火星へ向かうよりも大幅に燃料を削減できるため、深宇宙探査のコスト削減に直結する。国際宇宙探査チームの代表は「今回の基地完成は、人類が『地球に住む種』から『宇宙で暮らす種』へと進化する歴史的な一歩だ」と期待を語った。
```

から、さまざまな形式の短文を生成してみましょう。まずは

```
記事の内容が端的に伝わるように 30 字以内のタイトルをつけてください
```

と指示を与えてみたところ

```
人類初の常設月面基地「アルテミス・ベース」初期建設完了
```

と出力されました。続いて

```
この記事を匿名掲示板（5ch）のスレタイ風に要約してください
```

の指示だと

```
【朗報】新築一戸建て（閑静・日当たり良好・酸素なし）完成
```

それっぽいですね。さらに

```
この記事を川柳（五・七・五）で表現してください
```

の指示では

```
新時代、月を跨いで、火星へと
```

なかなか秀逸（？）な作品が出力されました。

ここで「どの短文が一番よいか」を問われても、何をもって「良さ」とするのかが定義されなければ、再現性のある回答をすることはできません。

ブリーフィングの品質についても同じことが言えます。

とはいえ、最初から抽象概念を定義することは難しいため、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

ではサービスの方向性を踏まえつつ「よいブリーフィング」の具体例を複数作ります。

それらを並べてみて

- 正確であることが重要なのか
- より読み手を惹きつけることが重要なのか
- センシティブな内容を表現する際にはどような配慮が必要か
- 例えばレトリックを用いるなどして、伝わりやすさを重視すべきか

などの観点から共通する特徴を抽出し、品質の定義に落とし込んでいきます。

# 品質の定義

DeepEval には、出力が入力に忠実であるかを評価する Faithfulness や、要約としての品質を評価する Summarization などの既成 Metrics があらかじめ用意されています。

しかし「よいブリーフィング」たる品質のすべてが、必ずしも既成 Metrics で評価できるとは限らないため、今回は自然言語で記述した評価基準に基づいた評価を実行できる <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a> を利用することにします。

例えば正確性の評価には

```
{
	"name": "accuracy",
	"criteria": "generated が original と矛盾せず、内容を正確に反映していること。original にない事実・推測・誇張・断定を追加せず、不確実な情報を事実として扱わないこと。情報量の不足は減点対象としない。"
}
```

機微情報に対する表現上の配慮には

```
{
	"name": "sensitivity",
	"criteria": "generated が死亡、事故、災害、犯罪、病気、自殺、差別、人権問題などのセンシティブな内容に対して適切な配慮をしていること。被害者、遺族、関係者、加害を疑われている人への不必要な断罪や揶揄を含まないこと。憶測や未確認情報によって名誉や信用を損なっていないこと。センシティブな内容について読者の興味を過度にあおる表現や娯楽的な表現を用いていないこと。"
}
```

といった具合です。

G-Eval は、この criteria を内部的に evaluation_steps という段階的なタスクに分割して評価を実行しますが、

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

バッチ処理による繰り返し評価をできるだけ短時間で実行するために

- criteria から evaluation_steps への変換結果をキャッシュして、繰り返し評価で使いまわす
- 上述「正確性の評価」「機微情報に対する表現上の配慮」など、各観点の評価を並列で実行する

のように評価ロボットを実装しました。

なので、多様な評価観点が処理時間に与える影響は抑えられているものの、増やせば増やすほど

- 各評価観点間の重複（例えば網羅性と正確性）
- 各評価観点間の衝突（例えば網羅性と簡潔さ）

が発生しやすくなり、評価に基づいた生成パイプラインの改善に支障が生じる場合がありました。

そこで、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

では「よいブリーフィング」の具体例と品質定義の整合性の確認に加え、評価観点の重複や衝突も確認し、改善を促す仕組を実装しました。

この段階を通じて、人間と AI の双方にとって「よいブリーフィング」の解像度を高めてゆきます。

# 評価のブレへの対策

生成パイプラインを改修した結果、正確性のスコアが 0.88 から 0.91 に変化したとします。

これは改修による改善効果と言えるでしょうか。

また、機微情報に対する表現上の配慮についてのスコアが 0.93 から 0.87 に変化したとします。

これは改修の副作用と言えるでしょうか。

AI の判断は常に一定となるわけではないため、

- スコアのブレの最小化
- スコアの変化を解釈するための指針

が必要になります。

前者については、G-Eval には LLM が出力するスコア候補の確率を利用して加重平均を求め、スコアリングのバイアスを抑える仕組みがあるため、それを活用することにしました（Bedrock など一部のバックエンドでは、この機能に必要な logprobs を活用することはできません）。

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

後者については、評価観点によってブレ幅が異なることが予想できます。

そこで、生成パイプラインの改善サイクルに入る手前の段階 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

でランダムに生成した多様な入力データを使い、評価ロボットによる評価繰り返し、評価の傾向を把握する仕組みを用意しました。

以下は、50 件の入力データに対して、3 回評価を実施した際の評価観点毎の標準偏差に関する統計情報です。

```
{
	"model": "YOUR_BACKEND_MODEL",
	"articles": 50,
	"iterations": 3,
	"note": {
		"stddevAvg": "Average standard deviation of repeated evaluations for the same test data. Lower values indicate more consistent scoring.",
		"stddevMax": "Maximum standard deviation among all test data. Lower values indicate the worst-case evaluation inconsistency is smaller.",
		"testDataInfo.stddev": "Standard deviation of the average scores across the test data. Higher values indicate the test data covers a wider range of quality."
	},
	"rubrics": {
		"accuracy": {
			"stddevAvg": 0.14920442564214614,
			"stddevMax": 0.2943920288775949,
			"testDataInfo": {
				"max": 0.8666666666666667,
				"min": 0.3333333333333333,
				"avg": 0.6546666666666666,
				"stddev": 0.10344295260888701
			}
		},
		"sensitivity": {
			"stddevAvg": 0.06505382386916238,
			"stddevMax": 0.37712361663282534,
			"testDataInfo": {
				"max": 1.0,
				"min": 0.7333333333333334,
				"avg": 0.952,
				"stddev": 0.07216031534791897
			}
		},
		...
	}
}
```

評価ロボットは stddevAvg や stddevMax を参考に、生成パイプライン改修前後のスコア差が想定しうる評価のブレに対してどの程度の大きさなのかを踏まえ、改善や悪化について定性的なフィードバックを出力します。

# 生成パイプライン

さて、いよいよ生成パイプラインの開発です。

品質定義から簡易プロンプトを生成する仕組みを用意したので、初版はそれを用います。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i04.png' />

大量の入力データで評価すると、早速いろいろと課題が見つかります。

例えば 30 文字以内で、と指示をしてもしばしば文字数をオーバーしてしまいます。

また、稀に多言語混入も発生しますし、禁止した単語を使ってしまう場合もあります。

これらはプロンプトで強く禁止しても、常に守られる保証はありません。

なのでプロンプトによる指示とルールベースの処理を分離することにしました。

例えば以下は

- 絵文字を空白に置換
- 1000 バイトを超える出力はやりなおし判断

のような処理を担当します。

```
#!/usr/bin/env python3

import re

EMOJI_PATTERN = re.compile(
    '['
    '\U0001F300-\U0001F5FF'
    '\U0001F600-\U0001F64F'
    '\U0001F680-\U0001F6FF'
    '\U0001F700-\U0001F77F'
    '\U0001F780-\U0001F7FF'
    '\U0001F800-\U0001F8FF'
    '\U0001F900-\U0001F9FF'
    '\U0001FA00-\U0001FA6F'
    '\U0001FA70-\U0001FAFF'
    '\U00002600-\U000026FF'
    '\U00002700-\U000027BF'
    ']'
)

MAX_BYTES = 1000

def utf8(in_text):
    return in_text.encode('utf-8')

#
# Return (processed_text, None) to accept the output.
# Return (None, feedback) to retry generation with the feedback.
#

def postproc(in_text):
    #
    # Replace emojis with spaces.
    #
    in_text = EMOJI_PATTERN.sub(' ', in_text)

    #
    # Retry if the generated text exceeds the maximum UTF-8 byte length.
    #
    if len(utf8(in_text)) > MAX_BYTES:
        return None, f'The output exceeds the maximum length of {MAX_BYTES} UTF-8 bytes. Please shorten the output.'

    #
    # Accept the generated text.
    #
    return in_text, None
```

AI はリトライで同じような失敗を繰り返すことがあるので、

- 失敗事例と失敗理由を添えた改善要求をプロンプトに追加する
- temperature を一時的に変更し出力候補の多様性を確保する

によって失敗の繰り返しを避けています。





# 生成パイプライン


★以下について述べる

・ルールベースの postproc の併用
・リトライでの指示追加 & 温度感やトークンのブースト
・コンテキスト情報の埋め込み

# 評価と改善（システム編）

★以下について述べる

・プリコンパイル（criteria → evaluation_steps）による rubric 生成
・並列処理の考察
・trimAndLoadJson での未停止運転

# 評価と改善（運用編）

★以下について述べる

・score だけでなく reason を品質改善に利用する
・expected_output に関する考察と不採用判断
・タイトルを使うか、ルールを強化するか「事実は全部合っているのに、関係性を間違えて要約する」ような問題まで出てきた

「事実は全部合っているのに、関係性を間違えて要約する」という課題は、LLMの要約タスクで非常によくある「あるある」です。ここをどうプロンプトやルールで乗り越えたのか（あるいは割り切ったのか）の具体例が少し書かれると、読者の「これ知りたかった！」という共感を呼べそうです。

# それでも残る品質問題

★これへの回答と危険カテゴリの除去や KW 除去などリスク回避策

- 肥大化するプロンプトをリファクタリングしたいけど、悪影響が心配だ
- モデルをアップグレードしたら、秘伝のタレ（プロンプト内の指示）がこれまでと同様に機能するだろうか
- 生成パイプラインの改善は一見成功しているようだけど、エッジケースで副作用を生まないだろうか
ex. 高リスク領域の自動生成のみ事前に除外するアプローチ
ex. 許可、事後チェック、事前承認、不許可に分類するアプローチ
ex. 本番ログを Judge して問題を早期検知するアプローチ

# 終わりに

★余談だが、ブリーフィングに限らず活用できる


★以下について述べる

・終わりに、で前作の伏線回収

