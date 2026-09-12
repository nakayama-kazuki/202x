# 今日、生成 AI は良い仕事をした。では、明日は？

こんにちは、エンジニアの中山です。

以前 Google の AI Overview で、<a href='https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/'>ピザに接着剤を使うアドバイス</a> が掲出されて話題になりましたが、皆さんは生成 AI の出力品質にどのように向き合ってますか？

- 肥大化するプロンプトをリファクタリングしたいけど、悪影響が心配だ
- モデルのアップグレード後、秘伝のタレ（トリッキーな指示）がこれまでと同様に機能するだろうか
- 生成パイプラインの構成変更は動作的には問題なさそうだけど、エッジケースで副作用を生まないだろうか

このような悩みを抱えている開発現場も多いのではないでしょうか。

私の担当するサービスでも、生成 AI を活用してニュース記事や SNS ポストのブリーフィングを自動生成したい、というニーズがありました。

そこで、この記事ではブリーフィングの自動生成を題材に、生成 AI の出力品質をどのように継続的に評価したのか、についてご紹介したいと思います。

# 評価プロセス全体像

最初に評価プロセス全体像を示します。プロセスに登場するのは、熟練編集者や運用担当などの人間（緑）と、評価ロボット（青）と、生成パイプライン（赤）です。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. 熟練編集者に「よいブリーフィング」の具体例を複数件作ってもらう
2. 続いて、具体例を抽象化し「よいブリーフィング」たる品質を定義してもらい、これを評価ロボットの頭脳とする
3. ここで、検証目的の評価を行う。評価ロボットは「よいブリーフィング」の具体例を「よい」と評価できるだろうか？
4. 期待した評価が得られるまで、具体例もしくは品質の定義を調整する

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

5. 初期バージョンのブリーフィング生成パイプラインを作る
6. 生成～評価のバッチ処理を実行する
	- 十分な量と多様性を持つ入力データセットからブリーフィングを生成する
	- 評価ロボットがブリーフィングに対する評価レポートを出力する
7. レポートに基づき生成パイプラインを改善し、それを次世代バージョンとする
8. 事前に定めた基準を達成するまで 6, 7 を繰り返す
9. 熟練編集者のチェックにより最終的なデプロイ判定を実施する

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

関連アセットはリポジトリで管理し、将来、モデルの変更やブリーフィングの仕様変更（例えばパーソナライズ強化）が生じた場合、必要な検証や過去版との比較を行います。

このプロセスの狙いは、評価ロボットで評価の一定の品質×量を担保しつつ、熟練編集者は人間だからこそ気付くことのできるリスクの精査にフォーカスすることで、評価の費用対効果を最大化することです。

それを実現するため、今回 <a href='https://deepeval.com/'>DeepEval</a> を利用した評価ロボットとプロセス支援のフレームワークを実装しましたが、運用を通じて様々な課題に直面しました。

ここからは、直面した課題とその対策について掘り下げていきます。

# よいブリーフィングの具体例

唐突ですが、架空の記事（長いので斜め読みで結構です）から

> 宇宙航空研究開発機構（JAXA）をはじめとする国際宇宙探査チームは7日、月面南部で建設を進めていた人類初の常設月面基地「アルテミス・ベース」の初期建設が完了したと発表した。これにより、人類が月面に長期間滞在し、科学研究や開発を行うための基盤が整った。
> 基地は居住モジュール、太陽光発電システム、月面の水資源から水素と酸素を抽出する実験プラントなどで構成される。今後は最大6名の宇宙飛行士が交代で常駐し、低重力環境が人体に与える影響の調査や天体観測、資源採掘の技術実証を行う予定だ。
> さらに、将来の有人火星探査に向けた「中継拠点」としての役割も期待されている。月面からのロケット打ち上げは、地球から直接火星へ向かうより燃料を削減できるためだ。国際宇宙探査チームの代表は、基地完成を人類が「宇宙で暮らす種」へ進化する歴史的な一歩だと期待を語った。

さまざまな形式の短文を生成してみましょう。まずはプロンプトに

> 記事の内容が端的に伝わるように 30 字以内のタイトルをつけてください

と指示を与えてみたところ

> 人類初の常設月面基地「アルテミス・ベース」初期建設完了

と出力されました。まあ、妥当なタイトルだと思います。続いて

> この記事を匿名掲示板（5ch）のスレタイ風に要約してください

の指示だと

> 【朗報】新築一戸建て（閑静・日当たり良好・酸素なし）完成

それっぽいですね。さらに

> この記事を川柳（五・七・五）で表現してください

の指示では

> 新時代、月を跨いで、火星へと

なかなか秀逸（？）な作品が出力されました。

ここで「どの短文が一番よいか」と問われた場合、何をもって「よい」とするのかの定義を抜きにしては、再現性のある回答はできません。

ブリーフィングの品質についても同じことが言えます。

とはいえ、最初から抽象概念にたどり着くことは難しいため、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

ではサービスの方向性を踏まえつつ、まずは「よいブリーフィング」の具体例をいくつか作ります。

それらを並べて

- 正確であることが重要なのか
- より読み手を惹きつけることが重要なのか
- センシティブな内容を表現する際にはどのような配慮が必要か
- 例えばレトリックを用いるなどして、伝わりやすさを重視すべきか

などの観点から共通する特徴を抽出し、品質の定義に落とし込んでいきます。

# 品質の定義

DeepEval には、出力が入力に忠実であるかを評価する Faithfulness や、要約としての品質を評価する Summarization などの既成 Metrics が用意されています。

しかし「よいブリーフィング」の品質が、必ずしも既成 Metrics で評価できるとは限らないため、今回は自然言語で評価観点を定義できる <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a> を利用することにします。

例えば、正確性なら

> generated が original と矛盾せず、内容を正確に反映していること。original にない事実・推測・誇張・断定を追加せず、不確実な情報を事実として扱わないこと。情報量の不足は減点対象としない。

機微情報に対する表現上の配慮なら

> generated が死亡、事故、災害、犯罪、病気、自殺、差別、人権問題などのセンシティブな内容に対して適切な配慮をしていること。被害者、遺族、関係者、加害を疑われている人への不必要な断罪や揶揄を含まないこと。憶測や未確認情報によって名誉や信用を損なっていないこと。センシティブな内容について読者の興味を過度にあおる表現や娯楽的な表現を用いていないこと。

といった具合に定義します。

評価ロボットは、これらの品質の定義に基づいて評価を行います。

各観点の評価は並列実行させるため、観点を増やしても処理時間への影響を抑えることはできますが

- 観点の重複により、品質定義それ自体の保守性が悪化する
- 観点の衝突により、例えば「簡潔さ」の改善が「網羅性」の改悪を招くなど、生成パイプラインの改善に支障が出る

などの問題も発生しやすくなるため、注意が必要です。

そこで、評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

では「よいブリーフィング」の具体例と品質定義の整合性に加え、評価観点の重複や衝突もレポートすることで、評価ロボットの改善を促すことにしました。

この段階を経ることで、人間と評価ロボットの双方にとって「よいブリーフィング」の解像度向上が期待できます。

# 生成パイプライン

評価プロセス全体像のこの部分 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

は、最終的に本番プロダクトに実装されることになります。

したがって、フレームワーク内で扱うプロンプトやルールベースの処理（Python コード）は、本番プロダクトに対する実装仕様と位置付けることができます。

最初から高い完成度を目指して作りこんでもよいのですが、初版は修正影響を把握しやすいシンプルなプロンプトをお勧めします。

フレームワークでも、品質の定義からシンプルなプロンプトを自動生成するツールを用意しました。

ところで、

- 多言語混入
- 文字数制限に違反
- 禁止した用語の利用

などは、プロンプトで強い禁止や推敲を課したとしても発生する場合があります。

そこで、ルールベースの処理はプロンプトから分離して

1. プロンプトによるブリーフィング生成
2. ルールベースの処理で生成結果の調整および制約のチェック
3. 制約を満たさないときは、失敗回避の「おまじない」を添えて 1 を再実行
	- プロンプトに失敗事例と失敗理由を添えた改善指示を追加
	- パラメータ（temperature）を一時的に変更し出力候補の多様性を高める

のように生成パイプラインを実装しました。

条件分岐や多段プロンプトへの対応は、将来ニーズが生じたときに考えることにします。

より現実的なニーズとしては、メタ情報の活用が考えられます。

40 代男性と 10 代女性では、同じニュースに対しても注目するポイントは異なるかもしれません。

また、レストランに関する SNS ポストの場合、ブリーフィングを掲出するタイミングの天気や時間帯によって、訴求の方向性を変えたくなるかもしれません。

そこで、メタ情報も入力データとしてプロンプトに入力できるようにしました。

補足として、この場合は評価ロボットも G-Eval の SingleTurnParams.CONTEXT を有効化し、生成条件と評価条件をそろえるようにしています。

# 評価のブレへの対策

早速ブリーフィングを評価してみましょう。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i08.png' />

前回の評価では 0.75 だった正確性のスコアが、生成パイプラインを改修した結果 0.91 に変化したとします。

これは改善したと言えるでしょうか。

また、機微情報に対する表現上の配慮についてのスコアが 0.93 から 0.84 に変化したとします。

これは改修の副作用（デグレ）でしょうか？

スコアに基づく意思決定のためには、まず評価のブレを抑制した上で、ブレの傾向を理解する必要がありそうです。

まず、論文 <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>G-EVAL: NLG Evaluation using GPT-4 with Better Human Alignment</a> では GPT-3.5 の評価において、モデルの決定性を高めるため temperature を 0 としていることと

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

DeepEval の AnthropicModel でも <a href='https://deepeval.com/integrations/models/anthropic#in-code'>デフォルトが 0</a> とされていることを根拠に

> temperature: A float specifying the model temperature. Defaults to TEMPERATURE if not passed; falls back to 0.0 if unset and raises if < 0.

評価ロボットでも 0 がブレの抑制に有利だと判断しました。ただし、将来のモデルではこの値を見直す必要があるかもしれません。

また、G-Eval には生成 AI が出力するスコア候補の確率を利用して加重平均を求め、スコアリングの <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>バイアスを抑える仕組み</a> があります。

評価のブレを直接的に抑制する機能ではありませんが、安定したスコアリングへの寄与を期待して、この仕組みも活用することにします（ただし Bedrock など一部のバックエンドでは、スコア候補の確率を利用することができません）。

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

さらに、G-Eval は内部的に、品質の定義を evaluation_steps という <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>段階的なタスクに分割</a> して評価を実行します。

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

例えば、正確性を評価する際は

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

機微情報に対する表現上の配慮を評価する際は

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

ここで、バッチ処理の都度タスク分割（= evaluation_steps の生成）を行う場合、

前バージョンと現バージョンの評価で、異なる evaluation_steps が生成され、結果として評価のブレが生じる懸念があります。

そこで、evaluation_steps は品質の定義が更新されない限り、同じものを再利用する実装にして評価のブレを抑制しました（副次的には処理コストの観点でも好都合です）。

# 変化を解釈するための指針


★★★


それでも評価のブレは発生するため、その傾向を理解した上でスコアに基づく意思決定をしましょう。

例えば、評価観点が離散的かつ客観的である場合（事実との整合性など）と、連続的かつ主観的である場合（ブリーフィングの訴求力など）では、ブレ幅が異なることが予想できます。

評価プロセス全体像の、生成パイプラインの改善サイクルに入る手前の段階 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

でランダムに生成した入力データセットを使い、同じ評価を繰り返すことで「評価のブレ」についての傾向をレポートします。


ブレの傾向を理解する必要がありそうです。



なお、評価プロセスの序盤では、少ない入力データセットでも問題を見つけやすいため、改善サイクルの速度を優先することをお勧めします。

生成パイプラインの品質が一定程度高くなった後に、十分な量と多様性を持つ入力データセットに切り替えることで、全体として効率よく改善を進めることができます。






# 変化を解釈するための指針

それでも、評価のブレをゼロにすることはできません。

加えて言えば、評価観点が離散的かつ客観的である場合（事実との整合性など）と、連続的かつ主観的である場合（ブリーフィングの訴求力など）では、ブレ幅が異なることが予想できます。

そこで、生成パイプラインの改善サイクルに入る手前の段階 …

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

でランダムに生成した入力データセットを使い、同じ評価を繰り返すことで「評価のブレ」についての傾向をレポートします。

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

評価ロボットは、stddevAvg や stddevMax から把握した評価の安定性も参考にしつつ、生成パイプライン改修前後のスコア変化を解釈し、改善や副作用（デグレ）について定性的なフィードバックを出力します。

なお testDataInfo.stddev は評価自体のブレではなく、入力データセットに含まれる生成結果の品質のばらつきを見るための指標です。

品質の幅を十分にカバーできていない場合は、入力データセットを見直して傾向を再度取得します。

こうすることで、生成パイプラインの改善方針や、デプロイ判定などの意思決定の根拠を強化することができます。



# 利用者体験への配慮

評価ロボットやプロセス支援のフレームワークは、エンジニア以外のプロジェクトメンバーにも使ってもらいたいと考えていました。

その場合、トレースバックの出力で利用者を困惑させるわけにはいきません。

フレームワーク側では try ～ except により例外を捕捉し、対応方法や再実行を促すメッセージを出力するようにしましたが、DeepEval 内部で発生する例外については、もう一歩踏み込んだ対策が必要でした。

例えば DeepEval の GEval._evaluate() には、評価モデルから返された値を JSON として解釈する箇所がありますが、あるモデルでは

```
{
	"score": 10,
	"reason": "...",
	"score": 10
}

Hmm, let me provide valid JSON:

{
	"reason": "...",
	"score": 10
}
```

のような出力となり、JSON のパース失敗でバッチ処理全体を停止させてしまうことがありました。

そこで、モデルが JSON として解釈できない出力を返した場合はリトライする、というやや苦しい対応も実装しました。

```
def generate_raw_response(self, in_prompt, **in_kwargs):
    def isDeepEvalSafe(in_string):
        try:
            # emulate trimAndLoadJson
            text = in_string.strip()
            if text.startswith('```'):
                text = text[3:]
            if text.startswith('json'):
                text = text[4:]
            if text.endswith('```'):
                text = text[:-3]
            json.loads(text.strip())
            return True
        except json.JSONDecodeError:
            return False
    retryCount = 0
    while True:
        chatCompletion = self.runner.toChatCompletion(in_prompt)
        if isDeepEvalSafe(chatCompletion.choices[0].message.content):
            break
        retryCount += 1
        if retryCount >= 10:
            raise RuntimeError('DeepEval acceptable response could not be generated.')
    untrackedCost = 0
    return chatCompletion, untrackedCost
```

トレースバック対策に加えて

- 恒常的に利用するツールと、補助ツールを明示的に分離する
- 関連業務に転用を想定して、中間結果の出力先をエクセルとする

によって、エンジニア以外のプロジェクトメンバーの利用ハードルを下げています。

# 評価と改善

評価ロボットはこのようなレポートを出力します。

<img width='800' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/report-ja.png' />

全体的な評価に続き、個別評価が並びます。

個別評価には G-Eval の出力する評価理由も含まれるため、適宜スコアの理由を確認しつつ生成パイプライン改善の参考にします。

ここでちょっとしたナレッジの共有です。

ニュース記事のタイトルには、その媒体の意図（例えば何を強調したいか）が含まれる場合があります。

生成パイプラインの入力にニュース記事のタイトルも併用したところ、この意図に出力が影響を受け、事実誤認寄りのブリーフィングが生成されてしまうことがありました。

他方、評価ロボット目線では入力と出力の整合性は保たれているため、正確性の評価では検知することができませんでした。

評価モデルや品質定義だけでなく、入力データも評価結果を左右します。

品質の定義に応じて、入力データを選択するようにしましょう。

また、個別の事実は正確でも、関係性を間違えたブリーフィングを出力してしまうケースもしばしば発生しました。

このケースについては、正確性の品質定義に「主体」「対象」「出来事」「条件」などの関係性の維持を指示として加えることで改善することができました。

# それでも残る品質問題

ここまでくれば、ブリーフィングの自動生成は問題なし、と言えるでしょうか。

いいえ、残念ながらリスクはゼロにはできません。

しかし、どこまでのリスクを排除すべきか、はサービスの方針次第です。

万が一のリスクを重く見る場合は、例えば皇室に関する話題や著名人の自殺報道などは

自動生成の対象外とするか、掲出前のチェックなど HITL によるガードを検討すべきかもしれません。

また、本番システムでもログを評価ロボットに評価させ、危ういスコアの場合にはアラートを上げて、必要に応じて差し止めるなどの早期検知も考えられます。

# 終わりに

★★上のに絵を入れる


★余談だが、ブリーフィングに限らず活用できる


★以下について述べる

・終わりに、で前作の伏線回収

