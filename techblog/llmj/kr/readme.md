<img width='100%' alt='ogp' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/ogp.png' />

# 오늘 생성 AI는 좋은 일을 했다. 그렇다면 내일은?

안녕하세요, 저는 일본인 엔지니어 pj-corridor입니다.

예전에 Google의 AI Overview가 <a href='https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/'>피자에 접착제를 사용하라는 조언</a>을 노출해 화제가 된 적이 있는데요. 여러분은 생성 AI의 출력 품질을 어떻게 다루고 계신가요?

- 점점 비대해지는 프롬프트를 리팩터링하고 싶지만, 부작용이 걱정된다
- 모델을 업그레이드한 뒤에도 지금까지 잘 작동하던 프롬프트 트릭이 그대로 통할까?
- 생성 파이프라인 구성을 변경했는데 동작 자체는 문제없어 보인다. 하지만 엣지 케이스에서 부작용이 생기지는 않을까?

이런 고민을 하고 있는 개발 현장도 많을 것 같습니다. 제가 담당하는 서비스에서도 생성 AI를 활용해 뉴스 기사나 SNS 게시물에서 브리핑을 자동 생성하고 싶다는 요구가 있었습니다.

그래서 이 글에서는 브리핑 자동 생성을 소재로, 생성 AI의 출력 품질을 어떻게 평가했는지 소개하려고 합니다.

# 평가 프로세스 전체 개요

먼저 평가 프로세스 전체를 살펴보겠습니다. 이 프로세스에는 숙련된 편집자나 운영 담당자 같은 사람(초록색), 평가 봇(파란색), 생성 파이프라인(빨간색)이 등장합니다.

<img width='600' alt='evaluation roles' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i00.png' />

1. 숙련된 편집자에게 "좋은 브리핑"의 구체적인 예시(이하 Gold Data)를 만들어 달라고 요청한다
2. 이어서 Gold Data를 추상화해 "좋은 브리핑"의 평가 기준(이하 Rubric)을 정의하고, 이를 평가 봇의 판단 기준으로 사용한다
3. 우선 검증해 본다. 평가 봇은 Gold Data에 높은 점수를 부여할 수 있을까?
4. 기대한 검증 결과가 나올 때까지 Gold Data 또는 Rubric을 수정한다

<img width='600' alt='Gold Data and Rubric validation' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i01.png' />

5. 초기 버전의 브리핑 생성 파이프라인을 만든다
6. 생성부터 평가까지의 배치 처리를 실행한다
    - 충분한 양과 다양성을 가진 입력 데이터셋에서 브리핑을 생성한다
    - 평가 봇이 브리핑에 대한 평가 리포트를 출력한다
7. 리포트를 바탕으로 생성 파이프라인을 개선하고, 이를 다음 세대 버전으로 삼는다
8. 사전에 정한 기준을 달성할 때까지 생성, 평가, 개선을 반복한다
9. 숙련된 편집자의 검토를 통해 최종 배포 여부를 판단한다

<img width='600' alt='generation to deployment' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i02.png' />

산출물과 리포트는 리포지토리에서 관리합니다. 앞으로 모델이 변경되거나 브리핑 사양이 바뀌는 경우, 예를 들어 개인화가 강화되는 경우에는 이 프로세스를 다시 수행하고 필요하다면 이전 버전과 비교합니다.

이 프로세스의 목적은 평가 봇을 통해 일정 수준의 평가 품질과 규모를 확보하는 한편, 숙련된 편집자는 사람만이 발견할 수 있는 리스크 검토에 집중함으로써 평가의 비용 대비 효과를 극대화하는 것입니다.

이를 위해 이번에는 <a href='https://deepeval.com/'>DeepEval</a>을 활용한 평가 봇과 프로세스 지원 프레임워크를 구현했습니다. 하지만 실제로 운영해 보니 여러 가지 과제에 부딪혔습니다.

이제부터는 그 과정에서 마주친 문제와 대응 방법을 자세히 살펴보겠습니다.

# Gold Data 만들기

갑작스럽지만, 다음은 가상의 기사입니다. 꽤 길기 때문에 대충 훑어보셔도 됩니다.

> 국제우주항공연구개발기구(ISADA)를 비롯한 국제 우주 탐사팀은 7일, 달 남부에서 건설을 진행해 온 인류 최초의 상설 달 기지 "아르테미스 베이스"의 초기 건설이 완료됐다고 발표했다. 이로써 인류가 달 표면에 장기간 체류하며 과학 연구와 개발을 수행하기 위한 기반이 마련됐다. 기지는 거주 모듈, 태양광 발전 시스템, 달의 수자원에서 수소와 산소를 추출하는 실험 플랜트 등으로 구성된다. 앞으로 최대 6명의 우주비행사가 교대로 상주하며 저중력 환경이 인체에 미치는 영향 조사, 천체 관측, 자원 채굴 기술 실증 등을 수행할 예정이다. 또한 향후 유인 화성 탐사를 위한 "중계 거점" 역할도 기대되고 있다. 달에서 로켓을 발사하면 지구에서 직접 화성으로 향하는 것보다 연료를 절약할 수 있기 때문이다. 국제 우주 탐사팀 대표는 기지 완성을 인류가 "우주에서 살아가는 종"으로 진화하는 역사적인 첫걸음이라고 평가했다.

여러 가지 형식의 짧은 문장을 생성해 보겠습니다. 우선 프롬프트에

> 기사의 내용을 간결하게 전달할 수 있도록 30자 이내의 제목을 붙여 주세요

라고 지시했더니

> 인류 최초 상설 달 기지 "아르테미스 베이스" 초기 건설 완료

라고 출력됐습니다. 꽤 무난한 제목이라고 생각합니다.

이어서

> 이 기사를 인터넷 커뮤니티 게시글 제목 스타일로 요약해 주세요

라고 지시하면

> [희소식] 신축 단독주택 완공 (조용한 동네·채광 좋음·산소 없음)

이라고 나왔습니다.

제법 그럴듯하네요.

그리고

> 이 기사를 5-7-5 형식의 하이쿠로 표현해 주세요

라고 지시했더니

> 새로운 시대, 저 달을 건너간다, 화성 향하여

제법 멋진(?) 작품이 나왔습니다.

여기서 "어떤 짧은 문장이 가장 좋은가?"라고 묻는다면, 무엇을 기준으로 "좋다"고 판단할 것인지 정의하지 않는 한 재현 가능한 답을 낼 수 없습니다.

브리핑도 마찬가지입니다. 하지만 처음부터 추상적인 개념에 도달하기는 어렵기 때문에, 평가 프로세스 전체 개요의 이 부분에서는...

<img width='600' alt='Rubric definition' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i03.png' />

서비스가 지향하는 방향을 고려하면서 먼저 "좋은 브리핑"의 Gold Data를 여러 개 만듭니다.

그리고 이를 나란히 놓고

- 정확한 것이 중요한가
- 독자가 더 읽고 싶게 만드는 것이 중요한가
- 민감한 내용을 표현할 때 어떤 배려가 필요한가
- 예를 들어 수사법을 활용하는 등 전달력을 중시해야 하는가

와 같은 공통 특성을 추출해 Rubric으로 정의합니다.

# Rubric 정의

DeepEval에는 출력이 입력 내용에 충실한지 평가하는 `Faithfulness`, 요약으로서의 품질을 평가하는 `Summarization` 등의 기존 Metrics가 준비되어 있습니다.

하지만 "좋은 브리핑"을 정의하는 Rubric이 반드시 기존 Metrics에 그대로 대응하는 것은 아닙니다. 그래서 이번에는 자연어로 Rubric을 정의할 수 있는 <a href='https://deepeval.com/docs/metrics-llm-evals'>G-Eval</a>을 사용하기로 했습니다.

예를 들어 정확성에 대해서는

> generated가 original과 모순되지 않으며 내용을 정확하게 반영해야 한다. original에 없는 사실, 추측, 과장, 단정적인 내용을 추가해서는 안 되며, 불확실한 정보를 사실인 것처럼 다뤄서는 안 된다. 정보량이 부족한 것만으로는 감점하지 않는다.

민감한 정보에 대한 표현상의 배려라면

> generated가 사망, 사고, 재해, 범죄, 질병, 자살, 차별, 인권 문제 등 민감한 내용을 적절하게 다뤄야 한다. 피해자, 유족, 관계자, 가해자로 의심받는 사람에 대한 불필요한 단죄나 조롱을 포함해서는 안 된다. 추측이나 확인되지 않은 정보로 명예나 신용을 훼손해서는 안 된다. 민감한 내용에 대해 독자의 관심을 과도하게 자극하는 표현이나 오락적인 표현을 사용해서는 안 된다.

와 같은 방식으로 Rubric을 정의하고, 평가 봇은 이를 참조합니다.

여러 관점의 평가를 병렬로 실행하기 때문에 평가 관점을 늘리더라도 처리 시간에 미치는 영향을 어느 정도 줄일 수 있습니다. 하지만

- 여러 관점에 걸쳐 Rubric 내부의 일부 지시가 중복되어 Rubric 자체의 유지보수성이 떨어진다
- 여러 관점에 걸쳐 Rubric 내부의 일부 지시가 충돌하고, 예를 들어 "간결성"을 개선한 결과 "포괄성"이 나빠지는 등 생성 파이프라인 개선에 방해가 된다

같은 문제도 발생하기 쉬우므로 주의가 필요합니다.

그래서 평가 프로세스 전체 개요의 이 부분에서는...

<img width='600' alt='Gold Data and Rubric review' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i05.png' />

"좋은 브리핑"의 Gold Data와 Rubric 간 정합성뿐 아니라 Rubric 간 중복과 충돌도 리포트해 평가 봇을 개선할 수 있도록 했습니다(리포트의 출력 언어는 변경할 수 있습니다).

<img width='600' alt='Gold Data and Rubric review report' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/review-en.png' />

이 단계를 거치면 사람과 평가 봇 모두 "좋은 브리핑"에 대해 더 명확한 기준을 가질 수 있을 것으로 기대할 수 있습니다.

다만 <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>G-Eval의 원 논문</a>에서는 요약 태스크에서 기존 방식보다 우수한 성능을 보였다고 보고하면서도, 사람 평가와의 Spearman 상관계수는 `0.514`였습니다.

> We show that G-EVAL with GPT-4 as the backbone model achieves a Spearman correlation of 0.514 with human on summarization task, outperforming all previous methods by a large margin.

따라서 Gold Data를 이용한 검증만으로 사람의 판단과 일치한다고 보장할 수 있다고 생각하지는 않습니다. 앞에서 설명했듯 평가 봇은 "일정 수준의 품질 × 규모"를 담당하는 역할로 두는 것이 현명합니다.

# 생성 파이프라인

평가 프로세스 전체 개요의 이 부분은...

<img width='600' alt='briefing generation pipeline' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i07.png' />

최종적으로 실제 프로덕트에 구현됩니다. 따라서 프레임워크 안에서 다루는 프롬프트나 규칙 기반 처리(Python 코드)는 실제 프로덕트 구현을 위한 사양으로 볼 수 있습니다.

처음부터 높은 완성도를 목표로 만들어도 되지만, 초기 버전은 수정에 따른 영향을 쉽게 파악할 수 있도록 단순한 프롬프트로 시작하는 것을 권장합니다. 프레임워크에도 Rubric에서 간단한 프롬프트를 자동 생성하는 도구를 준비했습니다.

그런데

- 여러 언어가 섞인 출력
- 글자 수 제한 위반
- 금지한 단어 사용

등의 문제는 프롬프트에서 강하게 금지하거나 다시 검토하도록 지시하더라도 발생할 수 있습니다.

그래서 규칙 기반 처리는 프롬프트에서 분리하고

1. 프롬프트를 이용해 브리핑 생성
2. 규칙 기반 처리로 생성 결과를 조정하고 제약 조건을 검사
3. 제약 조건을 만족하지 못하면 이전 실패를 피하기 위한 추가 지시와 함께 브리핑을 다시 생성
    - 프롬프트에 실패 사례와 실패 이유를 포함한 개선 지시를 추가
    - `temperature` 파라미터를 일시적으로 변경해 출력 후보의 다양성을 높임

과 같은 생성 파이프라인으로 구성했습니다.

조건 분기나 다단계 프롬프트는 실제 요구가 생길 때까지 지원을 보류했습니다. 하지만 메타 정보 입력은 필수 요구사항으로 두었습니다.

예를 들어 10대 여성과 40대 남성은 같은 뉴스에서도 주목하는 지점이 다를 수 있습니다. 레스토랑 관련 SNS 게시물이라면 브리핑이 노출되는 시점의 날씨나 시간대에 따라 강조하고 싶은 포인트가 달라질 수도 있습니다.

이처럼 메타 정보를 프롬프트에서 다루는 경우에는 평가 봇에서도 G-Eval의 `SingleTurnParams.CONTEXT`를 활성화해 생성과 평가 조건을 맞추고 있습니다.

# 평가의 변동성 줄이기

이제 생성 파이프라인의 출력을 평가해 보겠습니다.

<img width='600' alt='generation and evaluation' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i08.png' />

지난 평가에서 정확성 점수가 `0.75`였는데 이번에는 `0.91`로 변했다고 가정해 봅시다. 이것을 개선이라고 볼 수 있을까요?

또 민감한 정보에 대한 표현상의 배려 점수가 `0.93`에서 `0.84`로 떨어졌다고 해봅시다. 이것은 부작용, 즉 regression일까요?

점수를 기반으로 의사결정을 내리려면 평가의 변동성을 가능한 한 줄이는 동시에 그 특성을 이해한 뒤 변화를 해석할 필요가 있습니다.

먼저 변동성을 줄여 보겠습니다.

출력의 다양성을 조절하는 `temperature` 파라미터를 살펴보면, <a href='https://aclanthology.org/2023.emnlp-main.153.pdf'>G-Eval의 원 논문</a>에서는 GPT-3.5 평가 시 모델의 결정성을 높이기 위해 `temperature`를 `0`으로 설정했습니다.

> We use OpenAI’s GPT family as our LLMs, including GPT-3.5 (text-davinci-003) and GPT-4. For GPT-3.5, we set decoding temperature to 0 to increase the model’s determinism.

또한 `AnthropicModel`에서도 <a href='https://deepeval.com/integrations/models/anthropic#in-code'>기본값</a>은 `0.0`입니다.

> temperature: A float specifying the model temperature. Defaults to TEMPERATURE if not passed; falls back to 0.0 if unset and raises if < 0.

이를 근거로 평가 봇에서도 `0`을 채택했습니다. 다만 앞으로 다른 모델을 사용할 경우에는 이 값을 다시 검토할 수도 있습니다.

또한 G-Eval에는 생성 AI가 출력하는 점수 후보의 확률을 이용해 가중 평균을 계산함으로써 스코어링의 <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>편향을 줄이는</a> 메커니즘이 있습니다.

평가 변동성을 직접 줄이는 기능은 아니지만, 더 안정적인 스코어링에 도움이 될 것으로 기대해 이것도 활용하기로 했습니다. 다만 이번 구현에서 사용하는 Bedrock 등의 일부 백엔드에서는 점수 후보의 확률을 이용할 수 없습니다.

> In the original G-Eval paper, the authors used the probabilities of the LLM output tokens to normalize the score by calculating a weighted summation.
> This step was introduced in the paper because it minimizes bias in LLM scoring. This normalization step is automatically handled by deepeval by default (unless you're using a custom model).

또한 G-Eval이 내부적으로 평가를 <a href='https://deepeval.com/docs/metrics-llm-evals#how-is-it-calculated'>두 단계로 나누어</a> 수행한다는 점에도 주목했습니다.

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

그런데 이전 버전과 현재 버전을 평가할 때 서로 다른 `evaluation_steps`가 생성된다면, 그 차이 자체가 평가 변동성으로 이어질 수 있습니다.

그래서 Rubric이 변경되지 않는 한 `evaluation_steps`를 재사용하도록 구현했습니다. 부수적으로 처리 비용도 줄일 수 있었습니다.

# 평가 변동성의 특성 이해하기

그래도 평가의 변동성을 완전히 없앨 수는 없습니다.

또 평가 관점이 이산적이고 객관적인 경우, 예를 들어 사실과의 정합성을 평가하는 경우와, 연속적이고 주관적인 경우, 예를 들어 브리핑의 매력도를 평가하는 경우에는 변동성의 특성이 다를 수도 있습니다.

따라서 점수에 기반한 의사결정을 위해서는 평가 변동성이 어떤 특성을 보이는지 이해할 필요가 있습니다.

생성 파이프라인 개선 사이클에 들어가기 직전 단계에서...

<img width='600' alt='evaluation variance check' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i06.png' />

랜덤으로 생성한 입력 데이터셋을 사용해 동일한 평가를 반복함으로써 "평가 변동성"의 특성을 리포트합니다.

예를 들어 아래는 `articles`개의 입력 데이터셋을 `iterations`회 반복 평가했을 때 표준편차와 관련된 통계 정보입니다.

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

이 결과를 보면 정확성은 전반적으로 평가 변동성이 나타나는 반면, 민감한 정보에 대한 표현상의 배려는 일부 기사에서 변동성이 나타나는 경향을 확인할 수 있습니다.

여기서 `testDataInfo.stddev`는 평가 자체의 변동성이 아니라, 입력 데이터셋에 대한 평가 점수가 얼마나 넓게 분포하는지를 보기 위한 지표입니다.

분포의 폭이 충분하지 않다면 입력 데이터셋과 생성 결과의 분포를 다시 확인한 뒤 경향을 다시 측정합니다.

여담이지만, 최근 TypeSafe AI가 <a href='https://typesafe.ai/blog/introducing-system-one-models-and-jev'>Jev를 발표</a>했습니다. 자유로운 텍스트를 생성하는 대신 사전에 정의된 판단과 그 신뢰도를 출력하는 접근 방식은 평가 변동성과 관련된 문제를 해결하는 데 도움이 될 가능성이 있어 보입니다.

# 개선 사이클 반복하기

평가 봇은 통계 정보의 `stddevAvg`와 `stddevMax`도 참고하면서 점수 변화를 해석하고, 개선이나 부작용(regression)에 관한 리포트를 출력합니다(리포트의 출력 언어는 변경할 수 있습니다).

<img width='600' alt='briefing evaluation report' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/report-en.png' />

전체 평가에 이어 각 브리핑의 점수와 평가 이유가 표시됩니다.

그리고 이 리포트를 참고해 개선 사이클을 반복하게 됩니다.

하지만 평가 봇이 traceback을 출력하면 개선 사이클 자체도 멈추게 됩니다. 이를 피하려면 DeepEval 내부에서 발생하는 예외까지 고려한 대응이 필요했습니다.

예를 들어 DeepEval의 `GEval._evaluate()`에는 평가 모델이 반환한 값을 JSON으로 해석하는 부분이 있습니다. 그런데 어떤 모델에서는

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

같은 결과를 반환해 JSON 파싱 실패로 전체 배치 처리가 중단되는 경우가 있었습니다.

그래서 다소 현실적인 우회책이긴 하지만, 모델이 JSON으로 해석할 수 없는 출력을 반환한 경우에는 다시 처리를 시도하도록 했습니다.

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

개선 사이클을 반복하다 보면 여러 가지 인사이트를 얻을 수 있습니다. 그중 일부를 소개하겠습니다.

예를 들어 뉴스 기사의 제목에는 해당 매체의 의도, 즉 어떤 내용을 강조하고 싶은지가 반영되어 있을 수 있습니다.

생성 파이프라인의 출력이 그 의도에 지나치게 끌려가면서 사실을 잘못 전달하는 쪽에 가까운 브리핑이 생성되는 경우가 있었습니다.

하지만 평가 봇의 관점에서는 입력과 출력 간 정합성이 유지되고 있었기 때문에 정확성 Rubric으로는 이 문제를 탐지할 수 없었습니다.

결국 기사 제목을 입력에서 제외하는 방식으로 문제를 해결할 수 있었습니다. 이 사례를 통해 평가 모델이나 Rubric뿐 아니라 입력 데이터 자체도 평가 결과에 영향을 미친다는 점을 확인할 수 있었습니다.

또 개별 사실 자체는 정확하지만, 사실 간 관계를 잘못 연결한 브리핑이 생성되는 경우도 있었습니다.

이 경우에는 정확성 Rubric으로 문제를 탐지하지 못했습니다. 따라서 "주체", "대상", "사건", "조건" 등의 관계가 유지되는지도 평가할 수 있도록 정확성 Rubric을 수정해 개선을 시도했습니다.

운영 측면에서도 한 가지 인사이트가 있었습니다.

개선 사이클 초반에는 비교적 적은 수의 입력 데이터만으로도 치명적인 문제를 발견할 수 있습니다.

따라서 개선 사이클을 더 효율적으로 운영하려면, 처음에는 작은 데이터셋으로 시작하고 생성 파이프라인의 출력 품질이 일정 수준까지 올라온 뒤 충분한 양과 다양성을 갖춘 입력 데이터셋으로 전환하는 방식을 권장합니다.

# 마치며

이 과정을 거쳐 뉴스 기사와 SNS 게시물에서 "좋은 브리핑"을 자동 생성할 수 있게 되었고, 숙련된 편집자에게도 합격점 😊 을 받을 수 있었습니다.

<img width='600' alt='final deployment review' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/techblog/llmj/img/i09.png' />

그렇다면 내일부터도 자동 생성 결과에 문제가 없다고 말할 수 있을까요?

아쉽지만 반드시 그렇다고 할 수는 없습니다.

예를 들어 왕실 관련 이슈나 유명인의 자살 보도처럼 리스크를 쉽게 감수하기 어려운 사례에서는 HITL을 통한 게시 승인이 필요할 수도 있습니다.

또 실제 프로덕트에서도 평가 봇을 실행하고, 점수에 따라 게시를 차단하는 등의 운영 방식을 검토할 수도 있을 것입니다.

생성 AI를 실제 서비스에서 활용하는 일도 참 쉽지만은 않네요 😅

이 글이 생성 AI의 출력 품질과 관련해 고민하고 있는 분들에게 조금이나마 힌트가 되었으면 합니다.

이 글에서는 브리핑 자동 생성을 사례로 다뤘지만, 평가 봇과 프로세스 지원 프레임워크는 범용적인 텍스트 생성 용도에 대응할 수 있도록 구현했습니다. <a href='https://github.com/nakayama-kazuki/202x/tree/main/tools/llm-as-a-judge'>개인 사이트에서 구현을 공개</a>하고 있으니 필요하다면 활용해 주세요.

그리고 얼마 전 <a href='https://velog.io/@corridor-project/%EC%83%9D%EC%84%B1-AI-%EC%97%B0%EA%B3%84-%EC%95%A0%ED%94%8C%EB%A6%AC%EC%BC%80%EC%9D%B4%EC%85%98-%EA%B0%9C%EB%B0%9C-%EC%9D%B4%EB%9F%B0-%EC%83%81%ED%99%A9%EC%97%90%EC%84%9C%EB%8A%94-%EC%96%B4%EB%96%BB%EA%B2%8C-%ED%95%A0%EA%B9%8C'>개인 개발 AI 연동 애플리케이션에 관한 글</a>도 작성했는데, 그 글의 마지막에 남겨 두었던 LLM-as-a-Judge 이야기를 이번에 무사히 이어갈 수 있었습니다.

관심이 있다면 이전 글도 Episode #1으로 함께 읽어 주세요.
