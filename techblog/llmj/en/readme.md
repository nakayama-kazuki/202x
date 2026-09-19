<img width='100%' alt='ogp' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/ogp.png' />

# Did Generative AI Do a Good Job Today? What About Tomorrow?

Hi, I'm pj-corridor, an engineer.

A while ago, Google's AI Overviews drew attention after surfacing <a href='https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/'>advice about using glue on pizza</a>. How do you approach the quality of generative AI output?

- I want to refactor an increasingly bloated prompt, but I'm worried about unintended side effects.
- After upgrading the model, will those carefully tuned prompt tricks still work the same way?
- A change to the generation pipeline seems functionally fine, but could it introduce regressions in edge cases?

I imagine many development teams face similar concerns. In the service I work on, we also had a need to automatically generate briefings from news articles and social media posts using generative AI.

In this article, I'll use automated briefing generation as a case study to explain how we evaluated the quality of generative AI output.

# Overview of the Evaluation Process

Let's start with an overview of the evaluation process. The main actors are experienced editors and operations staff (green), an evaluation bot (blue), and the generation pipeline (red).

<img width='600' alt='evaluation roles' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. Ask experienced editors to create concrete examples of "good briefings" (hereafter, Gold Data).
2. Have them abstract the Gold Data into criteria that define what makes a briefing "good" (hereafter, Rubrics), which become the basis of the evaluation bot.
3. Run an initial validation. Can the evaluation bot assign high scores to the Gold Data?
4. Review either the Gold Data or the Rubrics until the validation produces the expected results.

<img width='600' alt='Gold Data and Rubric validation' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

5. Build the initial version of the briefing generation pipeline.
6. Run the generation and evaluation batch process.
    - Generate briefings from an input dataset with sufficient volume and diversity.
    - Have the evaluation bot produce evaluation reports for the generated briefings.
7. Improve the generation pipeline based on the reports and treat the result as the next-generation version.
8. Repeat generation, evaluation, and improvement until the predefined criteria are met.
9. Have experienced editors perform the final deployment review.

<img width='600' alt='generation to deployment' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

Artifacts and reports are managed in the repository. If the model changes in the future, or if the briefing specification changes—for example, to support stronger personalization—we can repeat the process and compare the new version against previous ones when necessary.

The goal of this process is to maximize the cost-effectiveness of evaluation: the evaluation bot provides a certain level of quality at scale, while experienced editors focus on reviewing risks that require human judgment.

To support this approach, we implemented an evaluation bot and process-support framework using <a href='https://deepeval.com/'>DeepEval</a>. Through actual use, however, we encountered a number of challenges.

Let's take a closer look at those challenges and how we addressed them.

# Creating Gold Data

Let's start with a fictional article. It's intentionally long, so feel free to skim it.

> The International Space and Aerospace Development Agency (ISADA) and other members of an international space exploration team announced on the 7th that initial construction of humanity's first permanent lunar base, "Artemis Base," near the Moon's south pole had been completed. The milestone establishes the infrastructure needed for humans to remain on the lunar surface for extended periods and conduct scientific research and development. The base consists of residential modules, solar power systems, and an experimental plant that extracts hydrogen and oxygen from lunar water resources. Up to six astronauts are expected to rotate through the base, conducting research into the effects of low gravity on the human body, astronomical observations, and technology demonstrations for resource extraction. The base is also expected to serve as a staging point for future crewed missions to Mars, since launching rockets from the Moon could require less fuel than traveling directly from Earth to Mars. A representative of the international exploration team described the completion of the base as a historic step toward humanity becoming "a species that lives in space."

Now let's generate several types of short-form text from it.

First, we prompted:

> Give this article a title of no more than 30 characters that concisely conveys its content.

And got:

> Humanity's First Moon Base

That seems like a reasonable title.

Next, we asked:

> Summarize this article as an internet forum thread title.

And got:

> [Good News] New house completed: quiet neighborhood, great sunlight, no oxygen

That certainly has the right vibe.

Next:

> Express this article as an acrostic using the word "MOON".

And got:

> **M**ankind makes a home beyond Earth <br>
> **O**n the Moon, a new chapter begins <br>
> **O**utward lies the journey to Mars <br>
> **N**ow, space becomes a place to live <br>

Not bad for an acrostic, right?

Now suppose we asked, "Which of these short texts is the best?"

Without defining what "good" means, there is no reproducible way to answer that question.

The same applies to briefings. Since it is difficult to arrive at an abstract definition from the outset, at this stage of the overall evaluation process...

<img width='600' alt='Rubric definition' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

...we first create multiple examples of "good briefings" as Gold Data, taking the direction of the service into account.

We then compare those examples and extract common characteristics such as:

- Is accuracy the most important quality?
- Is it more important to make readers want to continue reading?
- What kind of care is required when describing sensitive topics?
- Should clarity be prioritized, for example by using rhetorical techniques?

We use these shared characteristics to define the Rubrics.

# Defining the Rubrics

DeepEval provides built-in Metrics such as `Faithfulness`, which evaluates whether output is faithful to the input, and `Summarization`, which evaluates the quality of a summary.

However, the Rubrics that define a "good briefing" do not necessarily map directly to existing Metrics. For this reason, we chose <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a>, which allows Rubrics to be defined in natural language.

For example, an accuracy Rubric might be:

> The generated text must not contradict the original and must accurately reflect its content. It must not introduce facts, speculation, exaggeration, or definitive claims that are not present in the original, and it must not present uncertain information as established fact. Missing information alone should not reduce the score.

A Rubric for appropriate handling of sensitive information might be:

> The generated text must handle sensitive topics such as death, accidents, disasters, crime, illness, suicide, discrimination, and human rights issues with appropriate care. It must not include unnecessary condemnation or ridicule of victims, bereaved families, related parties, or people merely suspected of wrongdoing. It must not damage someone's reputation or credibility through speculation or unverified information. It must not use sensational or entertainment-oriented language to excessively attract attention to sensitive topics.

The evaluation bot refers to Rubrics like these when scoring outputs.

Because evaluations from multiple perspectives can be run in parallel, adding more perspectives does not necessarily have a large impact on processing time. However, increasing the number of Rubrics also creates problems such as:

- Instructions may overlap across Rubrics, reducing maintainability.
- Instructions may conflict across Rubrics. For example, improving "conciseness" could worsen "completeness," making it harder to improve the generation pipeline coherently.

These issues require care.

So, at this stage of the overall evaluation process...

<img width='600' alt='Gold Data and Rubric review' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

...we report not only the consistency between the Gold Data and the Rubrics, but also overlaps and conflicts among the Rubrics themselves, helping us improve the evaluation bot.

<img width='600' alt='Gold Data and Rubric review report' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/review-en.png' />

Going through this step helps both humans and the evaluation bot develop a clearer understanding of what constitutes a "good briefing."

That said, although <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>the original G-Eval paper</a> reported improvements over previous approaches for summarization tasks, its Spearman correlation with human evaluation was `0.514`.

> We show that G-EVAL with GPT-4 as the backbone model achieves a Spearman correlation of 0.514 with human on summarization task, outperforming all previous methods by a large margin.

We therefore do not assume that validation against Gold Data alone guarantees agreement with human judgment. As described earlier, it is more appropriate to assign the evaluation bot the role of providing "a certain level of quality at scale."

# Generation Pipeline

At this stage of the overall evaluation process...

<img width='600' alt='briefing generation pipeline' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

...the resulting pipeline will eventually be implemented in the production product. The prompts and rule-based processing (Python code) managed in the framework can therefore be treated as implementation specifications for the production system.

You could aim for a highly polished pipeline from the beginning, but I recommend keeping the first version simple so that the impact of each modification remains easy to understand. The framework also includes a tool that automatically generates a simple initial prompt from the Rubrics.

However, problems such as the following can still occur even if the prompt strongly prohibits them or explicitly asks the model to review its output:

- Mixed-language output
- Violations of character limits
- Use of prohibited words

For that reason, we separated rule-based processing from the prompt and built a pipeline like this:

1. Generate a briefing using the prompt.
2. Apply rule-based processing to adjust the result and validate constraints.
3. If the output does not satisfy the constraints, regenerate the briefing with additional guidance intended to avoid the previous failure.
    - Add the failed output and its failure reason to the prompt as feedback.
    - Temporarily adjust the `temperature` parameter to increase output diversity.

We decided not to support conditional branching or multi-stage prompting until an actual need arose. Metadata input, however, was treated as a mandatory requirement.

For example, a teenage woman and a man in his forties might focus on different aspects of the same news story. Similarly, for a social media post about a restaurant, the most effective angle for a briefing might depend on the weather or time of day when the briefing is displayed.

When metadata is included in the generation prompt, the evaluation bot also enables G-Eval's `SingleTurnParams.CONTEXT`, keeping the generation and evaluation conditions aligned.

# Reducing Evaluation Variance

Now let's evaluate the output of the generation pipeline.

<img width='600' alt='generation and evaluation' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i08.png' />

Suppose an accuracy score changes from `0.75` in the previous evaluation to `0.91` in the current one.

Can we say the system improved?

Now suppose the score for appropriate handling of sensitive information changes from `0.93` to `0.84`.

Is that a regression?

To make decisions based on scores, we need to reduce evaluation variance where possible and understand its characteristics before interpreting changes.

So first, let's try to reduce that variance.

Looking at the `temperature` parameter, which controls output diversity, <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>the original G-Eval paper</a> used a `temperature` of `0` when evaluating with GPT-3.5 in order to increase model determinism.

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

Likewise, the <a href='https://deepeval.com/integrations/models/anthropic#in-code'>default</a> for `AnthropicModel` is `0.0`.

> temperature: A float specifying the model temperature. Defaults to TEMPERATURE if not passed; falls back to 0.0 if unset and raises if < 0.

Based on this, we also use `0` for the evaluation bot. This value may need to be reconsidered for future models.

G-Eval also includes a mechanism that uses the probabilities of candidate scores produced by the generative model to calculate a weighted average and <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>reduce scoring bias</a>.

This does not directly eliminate evaluation variance, but we use it because we expect it to contribute to more stable scoring. However, some backends, including the Bedrock backend used in this implementation, cannot provide the score-token probabilities required for this mechanism.

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

We also paid attention to the fact that G-Eval internally performs evaluation in <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>two stages</a>.

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

For example, when evaluating the accuracy Rubric shown above, it may generate `evaluation_steps` like these:

```json
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

If different `evaluation_steps` are generated when evaluating the previous and current versions, that difference itself could contribute to evaluation variance.

To avoid this, our implementation reuses the same `evaluation_steps` unless the Rubric changes. As a side effect, this also reduces processing cost.

# Understanding Evaluation Variance

Even after these measures, evaluation variance cannot be eliminated entirely.

In addition, the characteristics of that variance may differ depending on whether an evaluation dimension is discrete and objective, such as factual consistency, or continuous and subjective, such as how engaging a briefing is.

To make better decisions based on scores, we therefore need to understand the characteristics of evaluation variance.

Immediately before entering the generation-pipeline improvement cycle...

<img width='600' alt='evaluation variance check' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

...we use a randomly generated input dataset and repeat the same evaluation multiple times to report the characteristics of "evaluation variance."

For example, the following statistics summarize the standard deviation observed when evaluating `articles` input items `iterations` times.

```json
{
	"model": "YOUR_BACKEND_MODEL",
	"articles": 75,
	"iterations": 5,
	"note": {
		"stddevAvg": "Average standard deviation of repeated evaluations for the same test data. Lower values indicate more consistent scoring.",
		"stddevMax": "Maximum standard deviation among all test data. Lower values indicate the worst-case evaluation inconsistency is smaller.",
		"testDataInfo.stddev": "Standard deviation of the average scores across the test data. Higher values indicate the test data covers a wider range of quality."
	},
	"rubrics": {
		"accuracy": {
			"stddevAvg": 0.17848219523165634,
			"stddevMax": 0.3666060555964672,
			"testDataInfo": {
				"max": 0.96,
				"min": 0.56,
				"avg": 0.7906666666666667,
				"stddev": 0.09308538493710433
			}
		},
		"sensitivity": {
			"stddevAvg": 0.09983845129437227,
			"stddevMax": 0.3006659275674582,
			"testDataInfo": {
				"max": 0.98,
				"min": 0.74,
				"avg": 0.8904,
				"stddev": 0.05650817050067478
			}
		},
		...
	}
}
```

From these results, we can see that accuracy tends to show evaluation variance more broadly, while appropriate handling of sensitive information tends to show larger variance only for some articles.

Note that `testDataInfo.stddev` is not a measure of evaluation variance. It indicates how widely the evaluation scores are distributed across the input dataset.

If that distribution is too narrow, we review the input dataset and the resulting output distribution before collecting the statistics again.

As an aside, TypeSafe AI recently announced <a href='https://typesafe.ai/blog/introducing-system-one-models-and-jev'>Jev</a>. Its approach of producing a predefined judgment and confidence score rather than generating free-form text looks promising for addressing some of the challenges related to evaluation variance.

# Iterating on the Improvement Cycle

The evaluation bot interprets score changes while also taking statistics such as `stddevAvg` and `stddevMax` into account, and produces reports describing potential improvements and regressions.

<img width='600' alt='briefing evaluation report' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/report-en.png' />

After the overall evaluation, the report lists scores and reasons for individual briefings.

We then use this report to iterate on the improvement cycle.

However, if the evaluation bot throws a traceback, the improvement cycle stops as well. Avoiding that required handling some exceptions that occur inside DeepEval.

For example, `GEval._evaluate()` contains logic that interprets the value returned by the evaluation model as JSON. With one model, however, we occasionally received output like this:

```json
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

This causes JSON parsing to fail and can stop the entire batch process.

As a somewhat pragmatic workaround, when the model returns output that cannot be interpreted as JSON, we retry the request.

````python
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
````

As we repeated the improvement cycle, we discovered a number of practical issues. Here are a few examples.

News headlines often reflect the publisher's editorial intent—for example, which aspect of a story they want to emphasize.

In some cases, the generation pipeline was pulled toward that framing and produced briefings that were factually misleading.

From the evaluation bot's perspective, however, the input and output were still consistent with each other, so the accuracy Rubric could not detect the problem.

We ultimately resolved the issue by excluding headlines from the input, but the lesson was that evaluation results are affected not only by the evaluation model and Rubrics, but also by the input data itself.

We also encountered cases where each individual fact was correct, but the relationships between those facts were wrong and could not be detected by the accuracy Rubric.

For those cases, we revised the accuracy Rubric so that relationships such as "actor," "target," "event," and "condition" would also be preserved and evaluated.

Another lesson came from operations.

Early in the improvement cycle, even a relatively small input dataset is often enough to expose critical problems.

For a more efficient improvement process, I recommend starting with a smaller dataset and switching to an input dataset with sufficient volume and diversity only after the generation pipeline reaches a reasonable level of quality.

# Conclusion

After going through this process, we were able to automatically generate "good briefings" from news articles and social media posts, and even received a passing grade 😊 from our experienced editors.

<img width='600' alt='final deployment review' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i09.png' />

Does that mean we can safely assume tomorrow's automatically generated briefings will also be fine?

Unfortunately, not necessarily.

For cases where the risk is difficult to accept—such as reporting involving members of the Imperial Family or the suicide of a public figure—we may still need HITL approval before publication.

It may also be worth running the evaluation bot in the production system itself and blocking publication when scores fall below a given threshold.

Using generative AI in production is not exactly effortless 😅

I hope this article provides some useful ideas for anyone struggling with the quality of generative AI output.

Although this article focused on automatically generating briefings, the evaluation bot and process-support framework are implemented as a general-purpose system for text-generation use cases. The <a href='https://github.com/nakayama-kazuki/202x/tree/main/tools/llm-as-a-judge'>implementation is available on my personal GitHub repository</a>, so feel free to use it if you find it useful.

I also wrote <a href='https://blog.techscore.com/entry/2026/05/13/080000'>an earlier article about a personal AI-integrated application</a>. That article ended with a small teaser about LLM-as-a-Judge, so I'm glad I finally got to follow up on it here.

If you're interested, you can think of that earlier article as Episode #1.
