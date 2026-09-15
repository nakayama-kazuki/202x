<img width='100%' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/ogp.png' />

# 오늘, 생성형 AI는 좋은 일을 했다. 그렇다면 내일은?

안녕하세요. 엔지니어 나카야마입니다.

이전에 Google의 AI Overview가 <a href='https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/'>피자에 접착제를 사용하라는 조언</a>을 노출해 화제가 된 적이 있는데요. 여러분은 생성형 AI의 출력 품질을 어떻게 관리하고 계신가요?

- 계속 비대해지는 프롬프트를 리팩터링하고 싶지만, 품질에 악영향이 생길까 걱정된다
- 모델을 업그레이드한 뒤에도 기존의 비법 소스(트릭성 지시)가 예전처럼 잘 작동할까?
- 생성 파이프라인의 구조를 변경했는데 동작에는 문제가 없어 보이지만, 엣지 케이스에서 부작용이 발생하지 않을까?

이런 고민을 안고 있는 개발 현장도 많지 않을까 싶습니다. 제가 담당하는 서비스에서도 생성형 AI를 활용해 뉴스 기사나 SNS 포스트의 브리핑을 자동 생성하고 싶다는 요구가 있었습니다.

그래서 이 글에서는 브리핑 자동 생성을 사례로, 생성형 AI의 출력 품질을 어떻게 평가했는지 소개하고자 합니다.

# 평가 프로세스 전체 구조

먼저 평가 프로세스의 전체 구조를 살펴보겠습니다. 이 프로세스에는 숙련된 편집자나 운영 담당자 등의 사람(녹색), 평가 로봇(파란색), 생성 파이프라인(빨간색)이 등장합니다.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. 숙련된 편집자가 '좋은 브리핑'의 구체적인 예시(이하 Gold Data)를 작성한다
2. 이어서 Gold Data를 추상화해 '좋은 브리핑'을 판단하기 위한 평가 기준(이하 Rubric)을 정의하고, 이를 평가 로봇의 두뇌로 사용한다
3. 시험 삼아 검증해 본다. 평가 로봇은 Gold Data에 높은 점수를 부여할 수 있을까?
4. 기대한 검증 결과에 도달할 때까지 Gold Data 또는 Rubric을 수정한다

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

5. 초기 버전의 브리핑 생성 파이프라인을 만든다
6. 생성부터 평가까지의 배치 처리를 실행한다
	- 충분한 양과 다양성을 가진 입력 데이터셋에서 브리핑을 생성한다
	- 평가 로봇이 브리핑에 대한 평가 리포트를 출력한다
7. 리포트를 바탕으로 생성 파이프라인을 개선하고, 이를 다음 버전으로 만든다
8. 사전에 정한 기준을 달성할 때까지 6, 7을 반복한다
9. 숙련된 편집자의 검토를 통해 최종 배포 여부를 결정한다

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

산출물과 리포트는 리포지토리에서 관리합니다. 향후 모델이 변경되거나 브리핑 사양이 바뀌는 경우(예: 개인화 강화), 이 프로세스를 다시 반복하고 필요하다면 이전 버전과 비교합니다.

이 프로세스의 목적은 평가 로봇을 통해 일정 수준의 평가 품질×수량을 확보하는 한편, 숙련된 편집자는 사람이기에 발견할 수 있는 위험 요소를 면밀히 검토하는 데 집중함으로써 평가의 비용 대비 효과를 극대화하는 것입니다. 이를 위해 이번에는 <a href='https://deepeval.com/'>DeepEval</a>을 활용한 평가 로봇과 프로세스 지원 프레임워크를 구현했는데, 실제로 운영하면서 여러 가지 과제에 부딪혔습니다.

지금부터는 그 과정에서 마주한 문제와 대응 방법을 좀 더 자세히 살펴보겠습니다.

# Gold Data 작성

갑작스럽지만, 다음과 같은 가상의 기사(조금 길기 때문에 가볍게 훑어보셔도 됩니다)를 예로 들어 보겠습니다.

> 국제우주항공연구개발기구(ISADA)를 비롯한 국제 우주 탐사팀은 7일, 달 남부에서 건설 중이던 인류 최초의 상설 달 기지 '아르테미스 베이스'의 초기 건설이 완료됐다고 발표했다. 이로써 인류가 달 표면에 장기간 체류하며 과학 연구와 개발을 수행할 수 있는 기반이 마련됐다. 기지는 거주 모듈, 태양광 발전 시스템, 달의 수자원에서 수소와 산소를 추출하는 실험 플랜트 등으로 구성된다. 앞으로 최대 6명의 우주비행사가 교대로 상주하며 저중력 환경이 인체에 미치는 영향 조사, 천체 관측, 자원 채굴 기술 실증 등을 수행할 예정이다. 또한 향후 유인 화성 탐사를 위한 '중계 거점' 역할도 기대되고 있다. 달에서 로켓을 발사하면 지구에서 화성으로 직접 향하는 것보다 연료를 절감할 수 있기 때문이다. 국제 우주 탐사팀 대표는 기지 완공이 인류가 '우주에서 살아가는 종'으로 진화하는 역사적인 첫걸음이 될 것이라는 기대를 밝혔다.

이 기사로 다양한 형식의 짧은 문장을 만들어 보겠습니다. 먼저 프롬프트에

> 기사의 내용을 간결하게 전달할 수 있도록 30자 이내의 제목을 작성해 주세요

라고 지시했더니

> 인류 최초 상설 달 기지 '아르테미스 베이스' 초기 건설 완료

라는 결과가 나왔습니다. 뭐, 무난한 제목이라고 생각합니다. 이번에는

> 이 기사를 인터넷 커뮤니티 게시글 제목처럼 요약해 주세요

라고 지시하면

> [희소식] 신축 주택 완공 (조용함·채광 좋음·산소 없음)

꽤 그럴듯하네요. 이번에는

> 이 기사를 5-7-5 형식의 하이쿠로 표현해 주세요

라고 지시했더니

> 새로운 시대, 저 달을 건너간다, 화성 향하여

제법 멋진(?) 작품이 나왔습니다.

여기서 "어떤 짧은 문장이 가장 좋은가?"라고 묻는다면, 무엇을 기준으로 '좋다'고 판단할지 정의되어 있지 않은 이상 재현성 있는 답을 내리기는 어렵습니다.

브리핑도 마찬가지입니다. 하지만 처음부터 추상적인 개념에 도달하기는 어렵기 때문에, 평가 프로세스 전체 구조의 이 부분 …

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

에서는 서비스의 방향성을 고려하면서 먼저 '좋은 브리핑'의 Gold Data를 여러 개 만듭니다.

그리고 이를 나란히 놓고

- 정확한 것이 중요한가
- 독자의 관심을 더 끄는 것이 중요한가
- 민감한 내용을 표현할 때 어떤 배려가 필요한가
- 예를 들어 수사법을 활용하는 등 전달의 용이성을 중시해야 하는가

와 같은 공통적인 특징을 추출해 Rubric으로 정리합니다.

# Rubric 정의

DeepEval에는 출력이 입력에 충실한지를 평가하는 `Faithfulness`, 요약으로서의 품질을 평가하는 `Summarization` 등 이미 만들어진 Metrics가 제공됩니다. 하지만 '좋은 브리핑'을 판단하는 Rubric이 반드시 기존 Metrics와 일치한다고 볼 수는 없기 때문에, 이번에는 자연어로 Rubric을 정의할 수 있는 <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a>을 사용하기로 했습니다.

예를 들어 정확성이라면

> generated가 original과 모순되지 않고 내용을 정확하게 반영할 것. original에 없는 사실, 추측, 과장, 단정을 추가하지 않고 불확실한 정보를 사실처럼 다루지 않을 것. 정보량이 부족한 것은 감점 대상으로 삼지 않는다.

민감한 정보에 대한 표현상의 배려라면

> generated가 사망, 사고, 재해, 범죄, 질병, 자살, 차별, 인권 문제 등 민감한 내용에 대해 적절히 배려할 것. 피해자, 유가족, 관계자, 가해자로 의심받는 사람에 대한 불필요한 단죄나 조롱을 포함하지 않을 것. 추측이나 확인되지 않은 정보로 명예나 신용을 훼손하지 않을 것. 민감한 내용에 대해 독자의 관심을 지나치게 자극하는 표현이나 오락적인 표현을 사용하지 않을 것.

과 같은 방식으로 Rubric을 정의하고 평가 로봇이 이를 참조하도록 합니다.

여러 관점의 평가를 병렬로 실행하기 때문에 평가 관점을 늘려도 처리 시간에 미치는 영향은 줄일 수 있지만,

- 서로 다른 평가 관점의 Rubric에 일부 지시가 중복되어 Rubric 자체의 유지보수성이 나빠진다
- 서로 다른 평가 관점의 일부 지시가 충돌해, 예를 들어 '간결성'을 개선한 결과 '포괄성'이 악화되는 등 생성 파이프라인 개선에 방해가 된다

와 같은 문제도 발생하기 쉬우므로 주의가 필요합니다.

그래서 평가 프로세스 전체 구조의 이 부분 …

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

에서는 '좋은 브리핑'의 Gold Data와 Rubric 간의 정합성뿐만 아니라 Rubric 간의 중복과 충돌도 리포트하도록 해 평가 로봇 자체를 개선할 수 있게 했습니다.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/review-ja.png' />

이 단계를 거치면 사람과 평가 로봇 모두 '좋은 브리핑'에 대한 이해도를 높일 수 있습니다.

# 생성 파이프라인

평가 프로세스 전체 구조의 이 부분 …

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

은 최종적으로 실제 프로덕트에 구현됩니다. 따라서 프레임워크에서 사용하는 프롬프트와 룰 기반 처리(Python 코드)는 실제 프로덕트의 구현 사양으로 볼 수 있습니다.

처음부터 높은 완성도를 목표로 만들어도 되지만, 초기 버전은 수정에 따른 영향을 파악하기 쉽도록 단순한 프롬프트로 시작하는 것을 권장합니다(프레임워크에도 Rubric으로부터 단순한 프롬프트를 자동 생성하는 도구를 마련했습니다).

그런데

- 여러 언어가 섞여 출력됨
- 글자 수 제한을 위반함
- 금지한 단어를 사용함

같은 문제는 프롬프트에서 강하게 금지하거나 충분히 검토하도록 지시하더라도 발생할 수 있습니다.

그래서 룰 기반 처리를 프롬프트와 분리해 다음과 같은 생성 파이프라인을 구성했습니다.

1. 프롬프트를 이용해 브리핑 생성
2. 룰 기반 처리로 생성 결과를 조정하고 제약 조건을 검사
3. 제약 조건을 충족하지 못하면 실패를 피하기 위한 일종의 '주문'을 덧붙여 1을 다시 실행
	- 프롬프트에 실패 사례와 실패 이유를 포함한 개선 지시를 추가
	- `temperature` 파라미터를 일시적으로 변경해 출력 후보의 다양성을 높임

한편 조건 분기나 다단계 프롬프트는 실제 필요가 생길 때까지 지원을 보류했지만, 메타 정보 입력은 필수 요구사항이라고 판단했습니다. 예를 들어 10대 여성과 40대 남성은 같은 뉴스에서도 주목하는 부분이 다를 수 있습니다. 또 레스토랑에 관한 SNS 포스트라면 브리핑을 노출하는 시점의 날씨나 시간대에 따라 강조하고 싶은 포인트가 달라질 수도 있습니다. 이처럼 프롬프트에서 메타 정보를 사용하는 경우 평가 로봇에서도 G-Eval의 `SingleTurnParams.CONTEXT`를 활성화해 생성과 평가의 조건을 일치시키도록 했습니다.

# 평가 편차 억제

그럼 생성 파이프라인의 출력을 평가해 보겠습니다.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i08.png' />

이전 평가에서 정확성 점수가 0.75였는데 이번에는 0.91로 바뀌었다고 가정해 보겠습니다. 이를 개선이라고 말할 수 있을까요? 또 민감한 정보에 대한 표현상의 배려 점수가 0.93에서 0.84로 바뀌었다면, 이는 부작용(성능 저하)이라고 볼 수 있을까요?

점수를 바탕으로 의사결정을 하려면 평가의 편차를 억제하는 동시에 그 경향도 이해한 뒤 변화의 의미를 해석할 필요가 있습니다. 먼저 편차를 줄이는 방법부터 살펴보겠습니다.

다양성을 조절하는 `temperature` 파라미터에 주목해 보면, <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>G-Eval 원 논문</a>에서는 GPT-3.5 평가 시 모델의 결정성을 높이기 위해 `temperature`를 0으로 설정했습니다.

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

또한 `AnthropicModel`에서도 기본값은 <a href='https://deepeval.com/integrations/models/anthropic#in-code'>0.0</a>입니다.

> temperature: A float specifying the model temperature. Defaults to TEMPERATURE if not passed; falls back to 0.0 if unset and raises if < 0.

이를 근거로 평가 로봇에서도 0을 사용했습니다. 다만 향후 모델에서는 이 값을 다시 검토해야 할 수도 있습니다.

또한 G-Eval에는 생성형 AI가 출력하는 점수 후보의 확률을 이용해 가중 평균을 계산함으로써 스코어링의 <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>편향을 줄이는</a> 방식이 있습니다. 평가 편차를 직접적으로 억제하는 기능은 아니지만, 보다 안정적인 스코어링에 기여할 것을 기대해 이 기능도 사용하기로 했습니다(단, Bedrock 등 일부 백엔드에서는 점수 후보의 확률을 사용할 수 없습니다).

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

그리고 G-Eval이 내부적으로 평가를 <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>두 단계로 나누어</a> 수행한다는 점에도 주목했습니다.

> Since G-Eval is a two-step algorithm that generates chain of thoughts (CoTs) for better evaluation, in deepeval this means first generating a series of evaluation_steps using CoT based on the given criteria, before using the generated steps to determine the final score using the parameters presented in an LLMTestCase.

예를 들어 앞에서 소개한 정확성을 평가할 때는 다음과 같은 `evaluation_steps`를 생성합니다.

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

그런데 이전 버전과 현재 버전을 평가할 때 서로 다른 `evaluation_steps`가 생성된다면, 그 자체가 평가 편차의 원인이 될 우려가 있습니다. 그래서 Rubric이 변경되지 않는 한 `evaluation_steps`를 재사용하도록 구현했습니다(부수적으로 처리 비용도 줄일 수 있었습니다).

# 평가 편차의 경향 이해하기

그럼에도 평가의 편차를 완전히 없앨 수는 없습니다. 또한 평가 관점이 이산적이고 객관적인 경우(사실과의 정합성 등)와 연속적이고 주관적인 경우(브리핑의 매력도 등)에는 평가 편차가 서로 다른 경향을 보일 수도 있습니다. 따라서 점수를 기반으로 의사결정을 하기 위해서는 편차가 어떤 경향을 보이는지도 이해할 필요가 있습니다.

생성 파이프라인의 개선 사이클에 들어가기 직전 단계 …

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

에서 무작위로 생성한 입력 데이터셋을 사용해 동일한 평가를 반복하고, '평가 편차'의 경향을 리포트합니다. 예를 들어 다음은 75개의 입력 데이터를 대상으로 평가를 5회 반복했을 때의 표준편차 관련 통계 정보입니다.

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

이를 해석해 보면 정확성 평가는 전반적으로 편차가 발생하는 반면, 민감한 정보에 대한 표현상의 배려는 일부 기사에서 평가 편차가 발생하는 경향을 확인할 수 있습니다. 한편 `testDataInfo.stddev`는 평가 자체의 편차가 아니라 입력 데이터셋에 대한 평가 점수가 얼마나 폭넓게 분포하는지를 확인하기 위한 지표입니다. 다양성이 충분하지 않다면 입력 데이터셋을 재검토한 뒤 다시 경향을 확인합니다.

# 개선 사이클 반복하기

평가 로봇은 통계 정보의 `stddevAvg`와 `stddevMax`도 참고하면서 점수 변화를 해석하고, 개선이나 부작용(성능 저하)에 관한 리포트를 출력합니다.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/report-ja.png' />

전체 평가에 이어 각 브리핑의 점수와 평가 이유가 표시됩니다.

이 리포트를 참고해 개선 사이클을 반복하게 되는데, 평가 로봇이 traceback을 출력하면 개선 사이클 자체도 멈추게 됩니다. 이를 방지하기 위해 DeepEval 내부에서 발생하는 예외에 대해서도 한 단계 더 깊이 들어간 대응이 필요했습니다.

예를 들어 DeepEval의 `GEval._evaluate()`에는 평가 모델이 반환한 값을 JSON으로 해석하는 부분이 있는데, 어떤 모델에서는

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

과 같은 출력을 반환해 JSON 파싱에 실패하면서 배치 처리 전체가 중단되는 경우가 있었습니다. 그래서 다소 고육지책이기는 하지만, 모델이 JSON으로 해석할 수 없는 출력을 반환하면 다시 처리를 시도하도록 했습니다.

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

그리고 개선 사이클을 반복하는 과정에서는 여러 가지 인사이트를 얻을 수 있습니다. 여기서는 그중 일부를 소개하겠습니다.

예를 들어 뉴스 기사 제목에는 해당 매체의 의도(무엇을 강조하고 싶은지 등)가 담겨 있을 수 있습니다. 그리고 생성 파이프라인의 출력이 그 의도에 영향을 받아 사실관계가 다소 왜곡된 브리핑이 생성되는 경우가 있었습니다. 이 경우 평가 로봇의 관점에서는 입력과 출력 간 정합성이 유지되고 있기 때문에 정확성 Rubric으로 문제를 감지할 수 없었습니다. 결국 제목을 입력에서 제외해 문제를 해결할 수 있었지만, 평가 모델이나 Rubric뿐만 아니라 입력 데이터 역시 평가 결과에 영향을 미친다는 점에 유의할 필요가 있습니다.

또 개별 사실은 정확하지만 사실 간의 관계를 잘못 표현한 브리핑이 생성되는 경우도 있었습니다. 이 경우에는 '주체', '대상', '사건', '조건' 등의 관계가 유지되도록 정확성 Rubric을 수정해 개선을 시도했습니다.

운영 측면에서 얻은 인사이트도 있습니다. 개선 사이클 초기에는 적은 수의 입력 데이터셋만으로도 치명적인 문제를 발견할 수 있습니다. 따라서 개선 사이클을 보다 효율적으로 운영하기 위해 생성 파이프라인의 출력 품질이 일정 수준 이상 높아진 뒤 충분한 양과 다양성을 갖춘 입력 데이터셋으로 전환하는 방식을 권장합니다.

# 마치며

이렇게 해서 뉴스 기사와 SNS 포스트로부터 '좋은 브리핑'을 자동 생성할 수 있게 되었고, 숙련된 편집자에게도 합격점을 😊 받을 수 있었습니다.

<img width='600' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i09.png' />

그렇다면 이제 내일 이후의 자동 생성도 문제없다고 말할 수 있을까요?

아쉽게도 그렇게 단언할 수는 없습니다. 예를 들어 일본 황실과 관련된 이슈나 유명인의 자살 보도처럼 위험을 쉽게 감수하기 어려운 사례는 HITL을 통해 노출 승인을 받아야 할 수도 있습니다. 또한 실제 프로덕트에서도 평가 로봇을 실행하고, 점수에 따라 노출을 차단하는 등의 운영 방식을 검토해야 할 수도 있습니다. 생성형 AI를 활용하는 것도 참 쉽지 않네요 😅

이 글이 생성형 AI의 출력 품질을 두고 고민하는 분들에게 문제 해결의 힌트가 되었으면 합니다.

이 글에서는 브리핑 자동 생성을 사례로 다뤘지만, 평가 로봇과 프로세스 지원 프레임워크는 범용적인 텍스트 생성 용도에도 사용할 수 있도록 <a href='https://github.com/nakayama-kazuki/202x/tree/main/tools/llm-as-a-judge'>구현을 공개하고 있으니(개인 사이트)</a> 필요하신 분들은 활용해 보시기 바랍니다.

그리고 얼마 전 <a href='https://blog.techscore.com/entry/2026/05/13/080000_1'>개인 개발 AI 연동 애플리케이션에 관한 글</a>을 썼는데요. 그 글의 마지막에 깔아 두었던 LLM-as-a-Judge라는 복선을 이번 글에서 무사히 회수할 수 있었습니다. 관심 있으시다면 이전 글도 Episode #1으로 함께 읽어 보세요.
