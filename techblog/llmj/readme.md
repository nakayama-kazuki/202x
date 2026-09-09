# 今日、生成 AI は良い仕事をした。では、明日は？

こんにちは、エンジニアの中山です。

以前 Google の AI Overview で、ピザに接着剤を使うアドバイスが掲出されて話題になりましたが、皆さんは生成 AI の出力品質にどのように向き合ってますか？

- 肥大化するプロンプトをリファクタリングしたいけど、悪影響が心配だ
- モデルのアップグレード後、秘伝のタレ（トリッキーな指示）がこれまでと同様に機能するだろうか
- 生成パイプラインの構成変更は動作的には問題なさそうだけど、エッジケースで副作用を生まないだろうか

このような悩みを抱えている開発現場も多いのではないでしょうか。

私の担当するサービスでも、生成 AI を活用してニュース記事や SNS ポストのブリーフィングを自動生成したい、というニーズがありました。

そこで、この記事ではブリーフィングの自動生成を題材に、生成 AI の出力品質をどのように継続的に評価したのか、についてご紹介したいと思います。

# 評価プロセス全体像

最初に評価プロセス全体像を示します。プロセスに登場するのは、熟練編集や運用担当などの人間（緑）と、評価ロボット（青）と、生成パイプライン（赤）です。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. 熟練編集者に「よいブリーフィング」の具体例を複数件作ってもらう
2. 上記 1 を参考にしつつ、熟練編集者に「よいブリーフィング」たる品質を定義してもらう
3. 上記 2 に基づいてブリーフィングをスコアリングする評価ロボットを作る
4. 評価ロボットが「よいブリーフィング」の具体例を「よい」と評価できるかどうかを検証する
5. 期待した評価が得られなかった場合は、上記 1 の具体例か上記 2 の定義の一方、もしくは両方を調整する

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

6. 初期バージョンのブリーフィング生成パイプラインを作る
7. 生成～評価のバッチ処理を実行
	- 十分な量と多様性を持つ入力データセットからブリーフィングを生成する
	- 評価ロボットがブリーフィングをスコアリング
8. 評価に基づき生成パイプラインを改善し、それを次世代バージョンとする
9. 上記 7, 8 を繰り返す

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

10. 熟練編集者のチェックにより最終的なデプロイ判定を実施
11. 将来モデルの変更やブリーフィングの仕様変更（例えばパーソナライズ強化）が生じた場合、その内容に応じてプロセスを繰り返す

このプロセスの狙いは、評価ロボットで評価の一定の品質×量を担保しつつ、熟練編集者は人間だからこそ気付くことのできるリスクの精査にフォーカスすることで、評価の費用対効果を最大化することです。

それを実現するため、今回 <a href='https://deepeval.com/'>DeepEval</a> を利用した評価ロボットとプロセス支援のフレームワークを実装しましたが、運用を通じて様々な課題が発生しました。

ここからは発生した課題とその対策について掘り下げていきます。

# よいブリーフィングとはなにか？

唐突ですが、架空の記事 …

> 宇宙航空研究開発機構（JAXA）をはじめとする国際宇宙探査チームは7日、月面南部にて建設を進めていた人類初の常設月面基地「アルテミス・ベース」の初期建設プロセスがすべて完了したと発表した。2020年代に始まった国際共同月探査プロジェクトの中核を担うこの基地の完成により、人類が月面に長期間滞在し、持続的な科学研究や開発を行うための基盤が整った。完成した月面基地は、居住モジュール、太陽光発電システム、そして月面の水資源から水素と酸素を抽出する実験プラントなどで構成されている。今後は、世界各国から選抜された最大6名の宇宙飛行士が数ヶ月交代で常駐し、低重力環境が人体に与える影響の調査や、月面での天体観測、資源採掘の技術実証を行う予定だ。さらに、この月面基地は将来の有人火星探査に向けた「中継拠点」としての役割も期待されている。地球よりも重力が小さい月面からのロケット打ち上げは、地球から直接火星へ向かうよりも大幅に燃料を削減できるため、深宇宙探査のコスト削減に直結する。国際宇宙探査チームの代表は「今回の基地完成は、人類が『地球に住む種』から『宇宙で暮らす種』へと進化する歴史的な一歩だ」と期待を語った。

から、さまざまな形式の短文を生成してみましょう。まずはプロンプトに

> 記事の内容が端的に伝わるように 30 字以内のタイトルをつけてください

と指示を与えてみたところ

> 人類初の常設月面基地「アルテミス・ベース」初期建設完了

と出力されました。まあ、妥当なタイトルですね。続いて

> この記事を匿名掲示板（5ch）のスレタイ風に要約してください

の指示だと

> 【朗報】新築一戸建て（閑静・日当たり良好・酸素なし）完成

それっぽいですね。さらに

> この記事を川柳（五・七・五）で表現してください

の指示では

> 新時代、月を跨いで、火星へと

なかなか秀逸（？）な作品が出力されました。

ここで「どの短文が一番よいか」と問われた場合、何をもって「よい」とするのかの定義を抜きにしては、再現性のある回答はできませんよね。

ブリーフィングの品質についても同じことが言えます。

とはいえ、最初から抽象概念にたどり着くことは難しいため、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

ではサービスの方向性を踏まえつつ、まずは「よいブリーフィング」の具体例を複数作ります。

それらを並べて

- 正確であることが重要なのか
- より読み手を惹きつけることが重要なのか
- センシティブな内容を表現する際にはどのような配慮が必要か
- 例えばレトリックを用いるなどして、伝わりやすさを重視すべきか

などの観点から共通する特徴を抽出し、品質の定義に落とし込んでいきます。

# 品質の定義

DeepEval には、出力が入力に忠実であるかを評価する Faithfulness や、要約としての品質を評価する Summarization などの既成 Metrics が用意されています。

しかし「よいブリーフィング」たる品質のすべてが、必ずしも既成 Metrics で評価できるとは限らないため、今回は自然言語で評価観点を定義できる <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a> を利用することにします。

例えば正確性の評価には

> generated が original と矛盾せず、内容を正確に反映していること。original にない事実・推測・誇張・断定を追加せず、不確実な情報を事実として扱わないこと。情報量の不足は減点対象としない。

機微情報に対する表現上の配慮には

> generated が死亡、事故、災害、犯罪、病気、自殺、差別、人権問題などのセンシティブな内容に対して適切な配慮をしていること。被害者、遺族、関係者、加害を疑われている人への不必要な断罪や揶揄を含まないこと。憶測や未確認情報によって名誉や信用を損なっていないこと。センシティブな内容について読者の興味を過度にあおる表現や娯楽的な表現を用いていないこと。

といった具合に定義します。

各観点の評価は並列実行させるため、観点を増やしても処理時間への影響は小さいのですが、

- 各評価観点間の重複により、品質定義それ自体の保守性が悪化する
- 各評価観点間の衝突により、例えば「簡潔さ」の改善が「網羅性」の改悪を招くなど、生成パイプラインの改善に支障が出る

などの問題も発生しやすくなるため注意が必要です。

そこで、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

では「よいブリーフィング」の具体例と品質定義の整合性に加え、評価観点の重複や衝突もレポートすることで、評価ロボットの改善を促します。

この段階を経ることで、人間と評価ロボットの双方にとって「よいブリーフィング」の解像度が高くなります。

# 評価のブレへの対策

生成パイプラインを改修した結果、正確性のスコアが 0.88 から 0.91 に変化したとします。

これは改修による改善効果と言えるでしょうか。

また、機微情報に対する表現上の配慮についてのスコアが 0.93 から 0.87 に変化したとします。

これは改修の副作用（デグレ）でしょうか？

生成 AI は、常に一定の判断をくだせるわけでないないことを理解しつつも、スコアを用いた意思決定の前提として、評価のブレは最小化したいと思います。

そこで G-Eval の仕組に着目してみましょう。

G-Eval は、内部的に品質の定義を evaluation_steps という段階的なタスクに分割して評価を実行します。

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

例えば正確性の評価ならば

```
"evaluation_steps": [
    "Read the original text carefully to identify all stated facts, claims, and the degree of certainty attributed to each piece of information.",
    "Read the generated text and list every factual claim, inference, or assertion it contains.",
    "For each item in the generated text, check whether it is directly supported by the original text. Flag any item that introduces a fact, detail, or figure not present in the original.",
    "Check whether the generated text adds speculation, predictions, or assumptions that are not present in the original.",
    "Check whether the generated text exaggerates or overstates any claim beyond what the original text supports.",
    "Check whether the generated text presents uncertain or conditional information from the original as definite fact.",
    "Check whether any statement in the generated text directly contradicts a statement in the original text.",
    "Do not penalize the generated text for omitting information that appears in the original, as insufficient information volume is not a scoring criterion.",
    "Assign a score based on the number and severity of violations found: no violations warrants the highest score, and each confirmed addition of unsupported facts, speculation, exaggeration, false certainty, or contradiction lowers the score proportionally."
]
```

機微情報に対する表現上の配慮ならば

```
"evaluation_steps": [
    "Read the generated text and identify whether it touches on sensitive topics such as death, accidents, disasters, crime, illness, suicide, discrimination, or human rights issues.",
    "If sensitive topics are present, check whether the generated text contains language that unnecessarily condemns or ridicules victims, bereaved families, related parties, or persons suspected of wrongdoing.",
    "Check whether the generated text uses speculation or unverified information in a way that could damage the reputation or credibility of any individual or group.",
    "Check whether the generated text uses sensationalist or entertainment-oriented language to heighten reader curiosity about sensitive content.",
    "If no sensitive topics are present, note that this rubric does not apply and assign the highest score.",
    "Assign a score based on the number and severity of violations found: appropriate handling of all sensitive elements warrants the highest score, and each instance of unnecessary condemnation, ridicule, reputation-damaging speculation, or sensationalism lowers the score proportionally."
]
```

といった具合です。

評価のバッチ処理の都度 evaluation_steps を生成する場合、

前バージョンの評価と、現バージョンの評価で異なる evaluation_steps が適用され、結果として評価のブレが生じる懸念があります。

そこで、evaluation_steps は品質の定義が更新されない限り、同じものを使いまわすようにしました（これは処理コストの観点でも好都合です）。

さらに、G-Eval には生成 AI が出力するスコア候補の確率を利用して加重平均を求め、スコアリングのバイアスを抑える仕組みがあるため、それも活用します（Bedrock など一部のバックエンドでは、この機能に必要な logprobs を活用することはできません）。

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

最後に、論文 <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>G-EVAL: NLG Evaluation using GPT-4 with Better Human Alignment</a> では temperature を 0 としていたため、評価ロボットでも 0 を採用することにしました。

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

このようにして、評価のブレを最小化しています。

# 変化を解釈するための指針













AI の判断は常に一定となるわけではないため

- スコアのブレ最小化する
- スコアの変化を解釈するための指針を提示する

ことが、評価および意思決定の精度を高めるために必要です。

前者については G-Eval の仕組に着目してみます。





★★



後者については、評価観点が離散的かつ客観的である場合（事実との整合性確認など）と、連続的かつ主観的である場合（訴求力など）では、ブレ幅が異なることが予想できます。

そこで、生成パイプラインの改善サイクルに入る手前の段階 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

でランダムに生成した入力データセットを使い、同じ評価を繰り返すことで「評価のブレ」の傾向をレポートします。

例えば、以下は 100 件の入力データに対し、3 回評価を繰り返した際の標準偏差に関する統計情報です。

```
{
	"model": "YOUR_BACKEND_MODEL",
	"articles": 100,
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

生成パイプラインは、最終的にサービスのプロダクトに実装されることになります。従って、フレームワーク内で扱うプロンプトやルールベースの処理（Python コード）は、プロダクトに対する実装仕様と位置付けることができます。

最初から高い完成度を目指して作りこんでもよいのですが、複雑化したプロンプトは修正影響を把握しづらくなるため、初版は品質定義から自動生成したシンプルでナイーブなプロンプトを用います。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i04.png' />

早速、幾つかの問題が見つかりました。

例えば 30 文字以内で、と指示があってもしばしば文字数をオーバーしてしまいます。

また、稀に多言語混入も発生しますし、禁止した用語を使ってしまう場合もあります。

プロンプトの指示は、必ずしも守られる保証はないため、ルールベースの処理はプロンプトから分離して

1. プロンプトによる生成
2. ルールベースの処理で上記 1 の結果を加工および要件チェック
3. 要件を満たさないときは上記 1 を再実行。この際に失敗を繰り返さないための「おまじない」を適用
	- プロンプトに失敗事例と失敗理由を添えた改善要求を追加
	- パラメータ（temperature）を一時的に変更し出力候補の多様性を高める

のように生成パイプラインを実装しました。

将来的に、より複雑なパイプラインを扱いたくなるかもしれませんが、それはニーズが生じたときに考えることにします。

なお、評価プロセスの序盤では、少ない入力データセットでも問題を見つけやすいため、改善サイクルの速度を優先することをお勧めします。

生成パイプラインの品質が一定程度高くなった後に、十分な量と多様性を持つ入力データセットに切り替えることで、全体として効率よく改善を進めることができます。

ところでブリーフィングは 40 代男性向け、20 代女性向けで最適化の方向性が変わるかもしれません。

また、天気や時間帯によっても訴求方向を変える可能性があります。

そこで上記のようなメタ情報も入力データとしてプロンプトに与えられるようにしました。

この場合、評価時にも同じメタ情報を参照しなければ、生成時に与えた条件を満たしているか正しく評価できません。

そのため、メタ情報を使う場合には評価ロボット側でも G-Eval の SingleTurnParams.CONTEXT を有効化し、生成条件と評価条件をそろえるようにしています。




# 評価と改善

評価ロボットやプロセス支援のフレームワークは、エンジニア以外のプロジェクトメンバーも利用する想定です。

この場合



Python や DeepEval のエラーで処理の中断
やたらと処理時間を要する


★以下について述べる

・並列処理の考察
・trimAndLoadJson での未停止運転
・score だけでなく reason を品質改善に利用する
・expected_output に関する考察と不採用判断
・タイトルを使うか、ルールを強化するか「事実は全部合っているのに、関係性を間違えて要約する」ような問題まで出てきた

・「事実は全部合っているのに、関係性を間違えて要約する」という課題は、生成 AI の要約タスクで非常によくある「あるある」です。ここをどうプロンプトやルールで乗り越えたのか（あるいは割り切ったのか）の具体例が少し書かれると、読者の「これ知りたかった！」という共感を呼べそうです。

# 評価と改善

評価ロボットから得られるのはスコアだけではありません。

G-Eval は評価理由も出力するため、生成パイプラインの改善ではスコアの上下だけでなく、その理由を確認するようにしました。

実際に評価を繰り返していると、単純なハルシネーションとは少し異なる問題も見つかります。

例えば、生成結果に登場する人物名、組織名、数値などはすべて原文に存在しているにもかかわらず、それらの関係性を誤って組み合わせてしまうケースです。

このようなケースを受け、正確性の評価では個々の事実が原文と一致しているかだけでなく、主体、対象、出来事、条件などの関係性が維持されているかについても確認するよう、品質定義を調整しました。

このように評価結果の reason を確認し、

* 生成パイプラインを改善すべき問題なのか
* 評価ロボットの品質定義を改善すべき問題なのか
* そもそも「よいブリーフィング」の定義を見直すべき問題なのか

を切り分けながら改善を繰り返します。

なお、DeepEval のテストケースには expected_output として期待する出力を与えることもできます。

ブリーフィングのような生成タスクでは、同じ記事から複数の良質な表現が成立するため、今回は特定の模範文との近さではなく、これまで定義してきた品質観点への適合性を評価する方針とし、expected_output は使用しませんでした。



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

