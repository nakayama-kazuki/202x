# 생성 AI 연계 애플리케이션 개발, 이런 상황에서는 어떻게 할까

안녕하세요, 저는 일본인 엔지니어 pj-corridor 입니다. 이 글에서는 생성 AI 연계 애플리케이션 개발을 통해 직면한 과제, 예를 들어 어뷰즈 대응이나 프롬프트 튜닝에서의 시행착오와 트레이드오프에 어떻게 대응했는지 소개합니다. 한국어로 다소 부자연스러운 표현이 포함될 수 있으니 양해 부탁드립니다。

먼저 개발한 성격 진단 애플리케이션을 체험해 보시기 바랍니다. 거슬리는 광고 😆 는 브라우저 창 너비를 조정하면 사라집니다。

- <a href='https://pj-corridor.net/personalitytest/OpenCAPS.html'>CAPS（= Controller, Analyzer, Promoter, Supporter）진단</a>
- <a href='https://pj-corridor.net/personalitytest/OpenDiSC.html'>DiSC（= Drive, Influence, Steadiness, Compliance）진단</a>

CAPS와 DiSC는 최근 유행하는 MBTI와 마찬가지로, 이른바 유사과학적인 성격 진단입니다。의사결정의 근거로 사용할 수는 없지만, 예를 들어 워크숍 참가자들이 진단 결과를 공유함으로써 자기소개 세션을 활기차게 만들고 분위기를 부드럽게 만드는 데에는 도움이 됩니다。그러한 기회에는 꼭 이 진단 애플리케이션을 사용해 보시기 바랍니다。

참고로 이것은 저의 CAPS 진단 결과입니다。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/pj-corridor.net/personalitytest/blog/sample.png' />

조언과 사용자 매뉴얼은 생성 AI에 의해 출력된 것이지만, 일본어 문장 안에 나타나는 “Respondent”라는 주어는 다소 어색하게 느껴집니다。이처럼 생성 AI 연계 애플리케이션은 높은 표현력을 얻는 한편 품질 측면의 리스크가 발생합니다。그렇다고 해서 품질 보증에 드는 비용을 개인 개발(취미 프로젝트) 범위에서 억제하려는 전제 하에。그래서 룰 기반 채점 로직은 deterministic하게 유지하고, 생성 AI의 출력은 보조적인 문장으로 제한함으로써 할루시네이션의 영향 범위를 제어했습니다。

이제부터는 구체적인 시행착오와 트레이드오프 대응 방법에 대해 세 가지 장으로 나누어 소개하겠습니다。

## 1. 어뷰즈 대응

진단 애플리케이션은 익명으로 접근할 수 있지만, 백엔드에는 과금이 발생하는 생성 AI（Amazon Bedrock）를 사용하고 있습니다。따라서 봇에 의한 어뷰즈로 인해 비용이 예상보다 크게 증가할 리스크도 충분히 고려할 수 있습니다。그렇다고 해서 모든 위협을 제거하는 것이 아니라, 공격자의 인센티브도 고려하여 다음과 같은 기본 방침을 세웠습니다。

- 현실화 가능성이 낮은 위협（고도화된 봇, 비공개 정보를 이용한 공격 등）은 수용
- 현실화 가능성이 높은 위협에는 어떤 형태로든 대응

### 1.1. WAF에 의한 일반적인 공격 트래픽 차단

WAF는 AWS 표준 보호 패키지를 참고하여 다음을 채택했습니다。

- `GeoRule`（공격이 많은 지역의 IP 차단）
- `AWS-AWSManagedRulesAmazonIpReputationList`（AWS에서 인증된 공격 IP 차단）
- `AWS-AWSManagedRulesAnonymousIpList`（터널링 등 신원 은폐 IP 차단）
- 애플리케이션에 맞게 조정한 `GlobalRateBasedRule`（요청 상한 설정）
- 애플리케이션에 맞게 조정한 `RateBasedRulePOST`（POST / PUT / DELETE 상한 설정）

그리고 `AWS-AWSManagedRulesSQLiRuleSet` 등 애플리케이션에 필요하지 않은 규칙은 제거했습니다。다만 Lambda 함수 URL을 공개 엔드포인트로 사용할 경우, CloudFront를 경유하지 않는 요청이 WAF를 우회할 수 있다는 점이 우려되었습니다。CloudFront 경유（= WAF 경유）임을 보장하는 방법도 있지만、

- Lambda 함수 URL의 `AuthType`을 `AWS_IAM`으로 변경하고 CloudFront OAC를 사용  
👉 이 경우 POST 요청 시 `x-amz-content-sha256` 지원이 필요
- CloudFront에서 확장 헤더에 비밀 정보를 추가하고 Lambda에서 검증  
👉 이 경우 여러 환경 변수 관리와 검증 처리가 필요

와 같이 환경에 의존하는 구현이 필요해집니다。악의적인 제3자가 Lambda 함수 URL을 알고 WAF를 우회할 리스크를 고려하여 이번에는 대응을 보류했습니다。

덧붙여서 보호 패키지뿐만 아니라 AWS 콘솔에서 설정한 내용은 잊기 쉽습니다。임시 설정을 되돌리는 것을 잊으면 장애의 원인이 되기도 합니다。이러한 상황에 대비하여 매니지드 서비스 설정은 리포지토리에서 관리하는 것을 권장합니다（IaC 바로 전 단계 정도）。

예를 들어 WAF 보호 패키지의 경우 …

1. 보호 패키지 <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/WAFPolicyApiCorridor.json'>JSON</a>을 Source of Truth로 리포지토리에서 관리  
2. 보호 패키지 변경은 항상 Source of Truth → AWS 콘솔 설정 순으로 수행  
3. Source of Truth와 실제 WAF 적용 상태를 <a href='https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml#L49'>CI로 정합성 확인</a>

와 같은 관리 방식을 생각할 수 있습니다。

그리고 WAF에는 후일담이 있습니다。진단 애플리케이션의 트래픽 규모에서는 WAF의 고정 비용이 Bedrock 사용 비용을 초과하게 되었습니다。사전 견적을 하지 않으면 이런 일이 발생한다는 경험에서 얻은 교훈입니다 😅

향후에는 트래픽이 증가하기 전까지 WAF 사용을 중단하고, 비용에 영향을 주는 POST 횟수 제한을 DynamoDB로 구현하는 것도 검토하고 있습니다。

### 1.2. 단순한 봇 및 비정상 접근 제어

접근 제어는 다음과 같이 구현했습니다。

1. 애플리케이션 접근 시 “비밀 정보 + 시간 정보”로 생성한 토큰을 `Set-Cookie`로 브라우저에 전달  
2. 브라우저는 fetch 요청 시 `credentials : 'include'`를 지정하여 토큰을 서버로 전송  
3. 서버는 인간의 응답 시간 범위 내에서 생성 가능한 토큰이면 정상 요청으로 판단  

또한 다음과 같은 대응도 병행했습니다。

- `SameSite=Strict`로 다른 도메인에서의 POST 요청 시 Cookie 차단（<a href='https://blog.techscore.com/entry/2023/10/06/110100'>SameSite@Set-Cookie 설명</a> 참고）
- 허용된 Origin만 `Access-Control-Allow-Origin`에 설정하여 브라우저를 통한 응답 접근 제한  

봇이 고도화되면 이러한 대응은 우회될 수 있지만, 초기 단계에서는 기본 방침 범위 내에서 운영하고, 접근 상황을 모니터링하면서 추가 대응을 검토할 예정입니다。

## 2. 기술 선택

여기에서는 Lambda와 API Gateway에 관한 시행착오를 소개합니다。

진단 애플리케이션의 실행 환경으로서 Lambda는 합리적인 선택이었지만、

1. Lambda 독자 컨테이너 방식（PHP 사용）
2. Lambda zip 방식（Python / Node 사용）

중에서 처음에는 1에 마음이 기울었습니다。이미 로컬에 PHP 테스트 환경을 구축해 두었기 때문에, 애자일한 개발과 테스트가 가능하다고 생각했기 때문입니다。그러나 Lambda와의 친화성이나 CI 복잡도에 대한 우려를 고려하여, 최종적으로 2를 선택하게 되었습니다。돌이켜보면 AWS 환경에서의 시행착오와 블랙박스를 해소하는 데 걸린 시간이 상대적으로 더 길었기 때문에, 적절한 선택이었다고 생각합니다。

또한 AWS 콘솔에서 Lambda 함수를 반복해서 생성하다 보면 그때마다 새로운 IAM Role이 자동 생성됩니다。이러한 잔해뿐만 아니라 사용하지 않는 리소스를 방치하면 장기적인 기술 부채가 되므로, 잊지 말고 정리해야 합니다。

실행 환경 준비가 끝났지만, 바로 애플리케이션 개발로 들어가고 싶은 마음을 잠시 억누르고, 이후 작업을 수월하게 하기 위해 Lambda 환경과 테스트 환경을 투명하게 다룰 수 있는 구조를 먼저 준비했습니다。

- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template.py'>환경 공통 Python 템플릿</a>
- <a href='https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat'>테스트 환경 런처</a>

이는 이후에 설명할 프롬프트 튜닝의 기반이 됩니다。

다음으로 API Gateway를 중간에 둘 것인지 여부에 대한 판단입니다。

|제공 기능|진단 애플리케이션 구현|
|---|---|
|인증|독자적인 접근 제어|
|라우팅|Lambda 내부에서 처리|
|스로틀링|WAF 대응（향후 변경 예정）|

이와 같은 상황을 고려했을 때, 현 단계에서는 비용이 이점을 초과한다고 판단하여 API Gateway 사용은 보류했습니다。

## 3. 애플리케이션 개발

어뷰즈 대응이 정해지고 기술 선택도 끝났다면, 이제 본격적인 애플리케이션 개발입니다。완성되면 전 세계 사용자에게 사용해 보도록 Reddit에 게시하고 싶습니다。그렇다면 사용자의 모국어로 UI를 제공하고 싶어집니다。이러한 동기에서 9개 언어를 지원하기 위해 간단한 i18n 클래스를 구현했습니다。

```
const GREETING = i18n.text({
    en : 'Hello',
    ja : 'こんにちは',
    fr : 'Bonjour',
    de : 'Hallo',
    es : 'Hola',
    pt : 'Olá',
    hi : 'नमस्ते',
    ko : '안녕하세요',
    zh : '你好'
})
```

또한 생성 AI 출력 품질을 안정화하기 위해, 사용자와의 인터페이스는 모국어로 유지하면서 생성 AI 입력은 영어로 고정했습니다。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/pj-corridor.net/personalitytest/blog/arch.png' width='600' />

또한 상태 관리와 UI 구성 요소, Lambda 및 테스트 환경과의 인터페이스 구현은 DiSC와 CAPS에서 공통화하여, 향후 MBTI와 같은 진단 애플리케이션을 개발할 때도 동일한 프레임워크를 활용할 수 있도록 했습니다。

이제 애플리케이션 개발도 막바지입니다。마지막으로 생성 AI 출력 품질의 향상과 안정화를 위해, 즉 프롬프트 튜닝에 착수합니다。여기서는 서두르지 않고, 먼저 시행착오를 위한 기반을 마련합니다。기술 선택에서 준비한 기반에 더해、

1. 프롬프트 생성용 단축 기능을 미리 준비
	- 진단 애플리케이션에서는 “랜덤 응답 + 진단 쿼리 실행” 자동화
		- 단축 실행용 비밀 정보는 <a href='https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/OpenCAPS.html#L2069'>해시로 검증</a>
2. 테스트 환경（생성 AI 미연결）에서 튜닝
	1. 단축 기능 실행
	2. 테스트 환경에서는 프롬프트（템플릿 + 응답 합성 결과）를 콘솔 출력
	3. Gemini나 ChatGPT로 실제 환경을 시뮬레이션하고 출력 평가
	4. 만족스럽지 않으면 템플릿이나 합성 방법을 수정하고 반복 평가
3. 실제 환경（생성 AI 연결）에서 튜닝
	1. 단축 기능으로 부분 검증
	2. 전체 애플리케이션 실행 후 최종 확인

이와 같은 방식으로 튜닝을 진행했습니다。다국어 지원의 경우, 실제 환경에서 모든 언어의 출력 결과를 확인하는 것이 중요합니다。저의 경우 이 과정에서 `hi`, `ko`, `zh` 출력 문제를 발견할 수 있었습니다。같은 내용이라도 언어에 따라 필요한 토큰 수가 크게 달라진다는 점도 이때의 학습이었습니다。

입력 측면에서도 Gemini나 ChatGPT의 제안은 종종 과도한 지시를 추가하여 프롬프트를 비대하게 만드는 경향이 있으므로, 적절한 정리와 구조 개선이 필요합니다。

마지막으로 서두에서 언급한 “Respondent” 문제를 다시 살펴보겠습니다。여기서는 문법상의 주어를 동료나 친구로 유지하면서, 사용자 매뉴얼의 대상은 “응답자”로 고정할 필요가 있었습니다。하지만

```
The second response must be written for the Respondent's colleagues or friends.
The grammatical subject must be the colleagues or friends, and when referring to the Respondent,
consistently use the {{lang}} term for "Respondent".
```

이와 같이 지시하면 문법상의 주어가 “당신”으로 바뀌는 문제가 발생합니다。그래서 대명사 사용을 금지하면 이번에는 “Respondent”가 그대로 출력됩니다 🤔。이는 학습 데이터 기반의 자연스러운 표현 생성과 주어 및 참조 제약이 충돌하기 때문입니다。결국 출력의 안정성을 확보하기 위해

```
The second response must be written for the Respondent's colleagues or friends.
The grammatical subject must be the colleagues or friends, and when referring to the Respondent,
always use the fixed keyword "_RESPONDENT_" without any modification, translation, or suffixes.
```

와 같이 `_RESPONDENT_`로 고정한 뒤 클라이언트에서 치환하는 방식으로 해결했습니다。즉, **완전히 이상적인 방법은 아니지만 실용적인 해결책 😅** 입니다。

```
const RESPONDENT = i18n.text({
    en : 'Respondent',
    ja : '回答者',
    fr : 'Répondant',
    de : 'Befragter',
    es : 'Encuestado',
    pt : 'Respondente',
    hi : 'उत्तरदाता',
    ko : '응답자',
    zh : '受访者'
});
```

## 마무리

여기까지 읽어주셔서 감사합니다。이번 진단 애플리케이션에서는 할루시네이션 영향 범위를 제어하는 것을 전제로 프롬프트 튜닝 구조화에 초점을 맞췄지만, 생성 AI 출력 품질 검증 자동화

- 규칙 기반 출력 형식 및 키워드 검사
- LLM A의 출력과 평가 기준을 LLM B에 입력하여 정성 평가

등은 향후 시도해 보고자 합니다。

이 글이 생성 AI 애플리케이션 개발에 도움이 되었기를 바랍니다。
