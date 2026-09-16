<img width='100%' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/ogp.png' />

# Generative AI Did a Good Job Today. But What About Tomorrow?

Hi, I'm Nakayama, an engineer.

Google's AI Overview once made headlines for <a href='https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/'>suggesting that people add glue to pizza</a>. How do you approach the quality of generative AI output?

- I'd like to refactor a prompt that keeps growing, but I'm worried about negatively affecting the output quality.
- After upgrading the model, will our secret sauce (those tricky little instructions) still work as before?
- We've changed the structure of the generation pipeline, and everything seems to work, but could there be side effects in edge cases?

I imagine many development teams have faced similar concerns. In the service I work on, we also had a need to automatically generate briefings from news articles and social media posts using generative AI.

In this article, I'll use automated briefing generation as an example to show how we approached evaluating the quality of generative AI output.

# Overview of the Evaluation Process

Let's start with an overview of the evaluation process. The process involves humans such as experienced editors and operations staff (green), an AI evaluator (blue), and a generation pipeline (red).

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. Ask experienced editors to create concrete examples of "good briefings" (hereafter, Gold Data)
2. Abstract the Gold Data into evaluation criteria for what constitutes a "good briefing" (hereafter, rubrics), and use them as the basis for the AI evaluator
3. Run an initial validation. Can the AI evaluator assign high scores to the Gold Data?
4. Revise either the Gold Data or the rubrics until the validation produces the expected results

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

5. Build the initial version of the briefing generation pipeline
6. Run a batch process from generation through evaluation
	- Generate briefings from an input dataset with sufficient volume and diversity
	- Have the AI evaluator produce an evaluation report for the briefings
7. Improve the generation pipeline based on the report and make it the next version
8. Repeat steps 6 and 7 until the predefined criteria are met
9. Have experienced editors perform the final review and make the deployment decision

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

We manage artifacts and reports in a repository. If the model changes in the future, or if the briefing requirements change—for example, to support stronger personalization—we can repeat the process and compare the new version with previous versions when necessary.

The goal of this process is to maximize the cost-effectiveness of evaluation: the AI evaluator provides a certain level of evaluation quality at scale, while experienced editors can focus on examining risks that only humans may notice. To make this possible, we built an AI evaluator and a process-support framework using <a href='https://deepeval.com/'>DeepEval</a>. As we operated it, however, we encountered a variety of challenges.

From here, I'll take a closer look at those challenges and how we addressed them.

# Creating Gold Data

Let's start with a fictional article (it's a little long, so feel free to skim it):

> The International Space and Aeronautics Development Agency (ISADA) and other members of an international space exploration team announced that initial construction of Artemis Base, humanity's first permanent lunar base, had been completed near the Moon's south pole. The milestone establishes the infrastructure needed for humans to remain on the lunar surface for extended periods and conduct scientific research and development. The base consists of habitation modules, a solar power system, and an experimental plant that extracts hydrogen and oxygen from lunar water resources. Up to six astronauts are expected to rotate through the base, conducting research into the effects of low gravity on the human body, astronomical observations, and demonstrations of resource extraction technologies. The base is also expected to serve as a staging point for future crewed missions to Mars, as launching rockets from the Moon could require less fuel than traveling directly from Earth to Mars. A representative of the international space exploration team described the completion of the base as a historic step toward humanity becoming "a species that lives in space."

Let's generate a few different kinds of short text from this article. First, I gave the model this prompt:

> Give this article a title of no more than 30 characters that concisely conveys its content.

The output was:

> First Permanent Lunar Base Completed

Well, that seems like a reasonable title. Next, I tried:

> Summarize this article as an internet forum thread title.

And got:

> [Great News] New Home Completed (Quiet Area, Great Sunlight, No Oxygen)

That certainly has the right vibe. Then I tried:

> Express this article as an acrostic using the word "MOON".

And got:

> **M**ankind makes a home beyond Earth
> **O**n the Moon, a new chapter begins
> **O**utward lies the journey to Mars
> **N**ow, space becomes a place to live

Not bad for an acrostic, right?

Now, if I asked, "Which of these short texts is the best?", it would be impossible to give a reproducible answer without first defining what "good" means.

The same applies to briefings. But since it's difficult to jump straight to an abstract definition, at this part of the overall evaluation process ...

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

... we first create multiple examples of "good briefings" as Gold Data, taking the direction of the service into account.

We then compare them and identify common characteristics, such as:

- Is accuracy important?
- Is it more important to attract the reader's interest?
- What kind of care is required when dealing with sensitive topics?
- Should clarity and accessibility be prioritized, for example by using rhetorical techniques?

We then turn those common characteristics into rubrics.

# Defining Rubrics

DeepEval provides built-in metrics such as `Faithfulness`, which evaluates whether an output is faithful to its input, and `Summarization`, which evaluates the quality of a summary. However, the rubrics that define a "good briefing" do not necessarily map directly to existing metrics. For this reason, we decided to use <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a>, which allows rubrics to be defined in natural language.

For example, an accuracy rubric might be:

> The generated text must not contradict the original and must accurately reflect its content. It must not add facts, speculation, exaggeration, or definitive claims that are not present in the original, and must not present uncertain information as fact. Insufficient information coverage should not be penalized.

For appropriate treatment of sensitive information:

> The generated text must handle sensitive topics such as death, accidents, disasters, crime, illness, suicide, discrimination, and human rights issues with appropriate care. It must not contain unnecessary condemnation or ridicule of victims, bereaved families, related parties, or people suspected of wrongdoing. It must not damage anyone's reputation or credibility through speculation or unverified information. It must not use sensational or entertainment-oriented language to excessively provoke the reader's interest in sensitive topics.

The AI evaluator refers to rubrics defined in this way.

Because evaluations from multiple perspectives are executed in parallel, adding more evaluation perspectives has a limited impact on processing time. However, increasing the number of rubrics also makes problems like these more likely:

- Some instructions may overlap across rubrics, making the rubrics themselves harder to maintain
- Some instructions may conflict across rubrics—for example, improving "conciseness" might degrade "comprehensiveness"—making it harder to improve the generation pipeline

This requires some care.

So, at this part of the overall evaluation process ...

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

... we made the framework report not only inconsistencies between the Gold Data and the rubrics, but also overlaps and conflicts among the rubrics, so that the AI evaluator itself can be improved (the report output language can be changed).

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/review-ja.png' />

Going through this step helps both humans and the AI evaluator develop a clearer understanding of what constitutes a "good briefing."

# Generation Pipeline

This part of the overall evaluation process ...

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

... will ultimately be implemented in the production system. In that sense, the prompts and rule-based processing (Python code) handled by the framework can be regarded as implementation specifications for the production system.

You could aim for a highly polished implementation from the beginning, but I recommend starting with a simple prompt whose changes and effects are easy to understand. The framework also includes a tool that automatically generates a simple initial prompt from the rubrics.

However, issues such as:

- Mixing multiple languages in the output
- Violating character limits
- Using prohibited words

can still occur even if the prompt explicitly prohibits them or instructs the model to carefully review its output.

For this reason, we separated rule-based processing from the prompt and built the generation pipeline as follows:

1. Generate a briefing using the prompt
2. Adjust the generated result and check constraints using rule-based processing
3. If the output fails to satisfy the constraints, rerun step 1 with a little extra "nudge" to avoid the previous failure
	- Add improvement instructions to the prompt that include the failed output and the reason it failed
	- Temporarily change the `temperature` parameter to increase the diversity of output candidates

We decided not to support conditional branches or multi-stage prompting until there was an actual need for them. Metadata input, however, was something we considered essential. Users from different age groups, for example, might focus on different aspects of the same news story. For a social media post about a restaurant, the weather or time of day when the briefing is displayed might also affect what we want to emphasize. When metadata is included in the prompt, we also enable G-Eval's `SingleTurnParams.CONTEXT` in the AI evaluator so that generation and evaluation operate under the same conditions.

# Reducing Evaluation Variability

Now let's evaluate the output of the generation pipeline.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i08.png' />

Suppose the accuracy score was 0.75 in the previous evaluation and changed to 0.91 in the current one. Can we say that the pipeline improved? And suppose the score for appropriate treatment of sensitive information changed from 0.93 to 0.84. Is that a side effect—a regression?

To make decisions based on scores, we need to reduce evaluation variability while also understanding its tendencies so that we can interpret score changes appropriately. Let's start by trying to reduce that variability.

Looking at the `temperature` parameter, which controls output diversity, the <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>original G-Eval paper</a> set `temperature` to 0 when evaluating with GPT-3.5 in order to increase model determinism.

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

The default for `AnthropicModel` is also <a href='https://deepeval.com/integrations/models/anthropic#in-code'>0.0</a>.

> temperature: A float specifying the model temperature. Defaults to TEMPERATURE if not passed; falls back to 0.0 if unset and raises if < 0.

Based on these references, we also use 0 for the AI evaluator. This value may need to be revisited for future models.

G-Eval also has a mechanism that uses the probabilities of candidate scores produced by the generative AI to calculate a weighted average, thereby <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>reducing bias in scoring</a>. This does not directly reduce evaluation variability, but we decided to use it as well in the expectation that it would contribute to more stable scoring. Note, however, that some backends, including Bedrock, cannot provide the probabilities required for this mechanism.

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

We also focused on the fact that G-Eval internally performs evaluation in <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>two stages</a>.

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

For example, when evaluating the accuracy rubric introduced above, G-Eval generates `evaluation_steps` like these:

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

However, if different `evaluation_steps` are generated when evaluating the previous and current versions, those differences themselves could contribute to evaluation variability. We therefore implemented the system so that `evaluation_steps` are reused as long as the rubric has not changed. As a side benefit, this also reduced processing costs.

# Understanding Evaluation Variability

Even with these measures, evaluation variability cannot be eliminated completely. Furthermore, evaluation criteria that are discrete and objective (such as factual consistency) may exhibit different variability from criteria that are continuous and subjective (such as how engaging a briefing is). To make decisions based on scores, we therefore need to understand the tendencies in that variability.

At this stage, just before entering the generation pipeline improvement cycle ...

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

... we use a randomly generated input dataset and repeat the same evaluation to report the tendencies in evaluation variability. For example, the following statistics show the standard deviations obtained by evaluating 75 input samples five times each.

```
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

From these results, we can see a tendency for accuracy evaluations to vary across the dataset, while evaluations of appropriate treatment of sensitive information tend to vary more noticeably for a subset of articles. Note that `testDataInfo.stddev` does not represent evaluation variability. Instead, it indicates how widely evaluation scores are distributed across the input dataset. If the dataset does not provide sufficient diversity, we review the input dataset and measure the tendencies again.

# Iterating on the Improvement Cycle

The AI evaluator interprets score changes while also taking statistics such as `stddevAvg` and `stddevMax` into account, and produces a report on improvements and possible side effects (regressions). The report output language can be changed.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/report-ja.png' />

The overall evaluation is followed by the score and evaluation rationale for each briefing.

We then use this report to iterate on the improvement cycle. However, if the AI evaluator throws a traceback, the improvement cycle itself comes to a halt. To avoid this, we had to go one level deeper and handle exceptions that occur inside DeepEval.

For example, `GEval._evaluate()` in DeepEval contains a step that interprets the value returned by the evaluation model as JSON. With one model, we occasionally received output like this:

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

This caused JSON parsing to fail and stopped the entire batch process. As a somewhat pragmatic workaround, when the model returns output that cannot be interpreted as JSON, we retry the operation.

````
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

As we repeated the improvement cycle, we also gained a number of insights. Here are a few of them.

For example, a news article's title may reflect the publisher's intent, such as what it wants to emphasize. We found cases where the generation pipeline was influenced by that intent and produced briefings that leaned toward factual misrepresentation. From the AI evaluator's perspective, however, the input and output were still consistent with each other, so the accuracy rubric could not detect the problem. We ultimately resolved the issue by excluding the title from the input, but this experience showed that not only the evaluation model and rubrics, but also the input data itself can affect evaluation results.

We also encountered cases where individual facts were correct, but the relationships between them were wrong. To address this, we revised the accuracy rubric to require preservation of relationships among elements such as the "subject," "object," "event," and "conditions."

We also learned something from an operational perspective. Early in the improvement cycle, even a small input dataset can reveal critical problems. For a more efficient improvement cycle, we therefore recommend switching to an input dataset with sufficient volume and diversity only after the generation pipeline has reached a certain level of output quality.

# Conclusion

With this process, we were able to automatically generate "good briefings" from news articles and social media posts, and even received a passing grade from our experienced editors 😊

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i09.png' />

Does that mean we can now trust tomorrow's automatically generated briefings as well?

Unfortunately, not necessarily. For cases where the risk is difficult to accept—such as stories involving the Japanese Imperial Family or reports of a celebrity's suicide—we may still need HITL approval before publication. We may also want to run the AI evaluator in the production system itself and, for example, block publication when scores fall below a certain level. Putting generative AI into practice isn't easy, is it? 😅

I hope this article provides some useful ideas for anyone dealing with the challenges of generative AI output quality.

Although this article used automated briefing generation as its example, the AI evaluator and process-support framework are designed for general-purpose text generation. <a href='https://github.com/nakayama-kazuki/202x/tree/main/tools/llm-as-a-judge'>The implementation is publicly available on my personal site</a>, so feel free to make use of it.

I also wrote <a href='https://blog.techscore.com/entry/2026/05/13/080000'>an article about a personal AI-integrated application</a> a little while ago. At the end of that article, I teased LLM-as-a-Judge—and I'm happy to finally follow up on it here 😊 If you're interested, feel free to read that earlier article as Episode #1 as well.
