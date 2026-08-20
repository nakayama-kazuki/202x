# 이런 상황에서 어떻게 할까: Three.js 애플리케이션 개발

<img width='100%' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/title.png' />

안녕하세요, 저는 일본인 엔지니어 pj-corridor입니다. 이 글에서는 취미로 진행한 Three.js 애플리케이션 개발을 통해 얻은 기술적인 지식, 예를 들어 Three.js 초보자가 직면하기 쉬운 문제나 브라우저 간 호환성에 기인한 문제, 그리고 그에 대한 회피 방법을 설명합니다.

먼저 Three.js 애플리케이션을 소개하겠습니다.

### 새로운 콘셉트의 리버시

<img width='300' src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

리버시에 Three.js가 필요한가? 라고 생각할 수도 있지만, 원통 형태로 루프되는 3D 보드에서 기존에는 없던 새로운 전략성을 경험할 수 있습니다. 또한 DMZ 개념의 도입과 NPC 선택의 폭(1~3)도 넓으며, 루프 보드에서는 회전 전략도 선택할 수 있습니다. 규칙 기반(2025년 6월 기준)의 NPC 구현은 1대1에서는 다소 아쉬울 수 있지만, 혼란스러운 4인 대전(NPC x3 + 인간)에서는 경험자도 고전할 수 있습니다. 시간 날 때 한 번 플레이해 보세요.

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=traditional'>일반 보드 리버시</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=hexmap&level=3'>헥스 보드 리버시</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=variety&level=2'>복잡 보드 리버시</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=loop&level=5'>루프 보드 리버시</a>

### 다양한 퍼즐

<img width='300' src='https://pj-corridor.net/images/ix-cube1.png' />

Three.js 학습용으로 자주 사용되는 루빅큐브를 발전시켜 다양한 퍼즐을 개발해 보았습니다. 물론 <a href='https://www.youtube.com/@Z3Cubing'>Z3Cubing</a>과 비교하면 아직 부족합니다. 앞으로는 물리적인 장치로는 구현할 수 없는 동작(예: <a href='https://pj-corridor.net/cube3d/caterpillar.html'>비정형 회전</a>)을 탐구해 나갈 예정입니다.

- <a href='https://pj-corridor.net/cube3d/cube3d.html'>일반 루빅큐브</a>
- <a href='https://pj-corridor.net/cube3d/cube3d.html?level=3'>조각 형태가 비정형인 큐브</a>
- <a href='https://pj-corridor.net/cube3d/caterpillar.html'>조각 회전이 비정형인 큐브</a>
- <a href='https://pj-corridor.net/cube3d/diamond.html'>다이아몬드 형태 퍼즐</a>
- <a href='https://pj-corridor.net/cube3d/gemini.html'>쌍둥이 큐브</a>
- <a href='https://pj-corridor.net/side-six/side-six.html'>원통형 퍼즐</a>

### 스틱맨

<img width='300' src='https://pj-corridor.net/images/ix-figure.png' />

저는 <a href='https://lydesign.jp/n/n3aa55611b347'>도식 중심의 파워포인트 슬라이드</a>를 만들 때가 있는데, 슬라이드에 붙일 저작권 자유 스틱맨 소재를 찾는 일은 생각보다 손이 많이 갑니다. 그래서 직접 제작하게 되었고, 그 결과물이 바로 이것입니다. 여러분의 슬라이드에도 꼭 활용해 보세요.

- <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>스틱맨(관절 조작 포징)</a>
- <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>고무 인간(늘리고 구부리는 포징)</a>
- <a href='https://pj-corridor.net/stick-figure/hand.html'>손(늘리고 구부리는 포징)</a>

### 스틱맨 갤러리

<img width='300' src='https://pj-corridor.net/images/figure-gallery.png' />

스틱맨으로 소재 문제는 해결했지만, 포즈를 잡는 것조차 번거롭게 느껴지게 되어 :-p 구조화된 포즈 데이터의 입출력과 이를 활용한 갤러리를 준비했습니다. 원하는 이미지에 가까운 것을 찾아 약간만 수정하면 목적에 맞는 스틱맨 소재를 얻을 수 있습니다.

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>스틱맨 갤러리</a>

다음 단계로는 포즈 데이터에 라벨을 붙이고, 기계 학습을 활용하여 자연어(예: 감정이나 자세를 나타내는 단어)로부터 적절한 포즈를 생성하는 스틱맨을 구상 중입니다.

이제부터는 Three.js 애플리케이션 개발을 통해 얻은 지식을 설명하겠습니다.

## 렌더링 버퍼는 텅 비어 있다

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/screenshot.gif' />

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>스틱맨</a>이나 <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>고무 인간</a>, <a href='https://pj-corridor.net/stick-figure/hand.html'>손</a>에서는 결정된 포즈의 이미지를 클립보드에 복사하는 screenshot 기능을 구현하고 있습니다. 이 기능에서 `WebGLRenderer.domElement`(<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.domElement'>사양</a>)의 `toDataURL()`을 사용하고 있지만, 처음에는 렌더링된 이미지를 가져오지 못해 어려움을 겪었습니다.

예를 들어 다음과 같은 코드의 경우

```javascript
const w = 400;
const h = 400;

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);

const camera = new THREE.PerspectiveCamera(45, w / h);
camera.position.set(0, 0, +1000);

const scene = new THREE.Scene();
const geometry = new THREE.BoxGeometry(50, 50, 50);
const material = new THREE.MeshNormalMaterial();
const box = new THREE.Mesh(geometry, material);
scene.add(box);

renderer.render(scene, camera);

// (1) capture the canvas image right after WebGLRenderer.render()
console.log(renderer.domElement.toDataURL('image/png'));

setTimeout(() => {
    // (2) capture the canvas image in a timer event handler
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);

button.addEventListener('click', in_ev => {
    // (3) capture the canvas image in a click event handler
    console.log(renderer.domElement.toDataURL('image/png'));
});
```

코드의 (1) 시점에서는 `toDataURL()`로 기대한 출력이 얻어지지만, (2)와 (3) 시점에서는 제대로 동작하지 않습니다. 그 이유는 `WebGLRenderer`가 각 프레임의 렌더링 후 자동으로 렌더링 버퍼를 초기화하기 때문입니다. 시험 삼아 `WebGLRenderer.preserveDrawingBuffer`(<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.preserveDrawingBuffer'>사양</a>)로 렌더링 버퍼를 유지하도록 설정하면

```javascript
const renderer = new THREE.WebGLRenderer({preserveDrawingBuffer : true});
```

비동기적으로 호출되는 (2)와 (3) 시점에서도 기대한 출력을 얻을 수 있습니다. 다만 <a href='https://registry.khronos.org/webgl/specs/latest/1.0/'>WebGL Specification</a>에 따르면

> While it is sometimes desirable to preserve the drawing buffer, it can cause significant performance loss on some platforms. Whenever possible this flag should remain false and other techniques used.

라는 non-normative 설명이 있으며, 과거에는 WebKit에서 관련 버그도 보고된 바 있습니다. 따라서 렌더링 버퍼 설정은 기본값인 `false`를 유지하고, `toDataURL()` 직전에 다시 렌더링하는 방식으로 대응합니다.

```javascript
setTimeout(() => {
    // (2) capture the canvas image in a timer event handler
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);

button.addEventListener('click', in_ev => {
    // (3) capture the canvas image in a click event handler
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
});
```

이로써 screenshot 기능을 안정적으로 구현할 수 있었습니다. 파워포인트 슬라이드에 붙여서 활용해 보세요.

## 레이캐스트의 함정 3가지

Three.js 애플리케이션에서는 터치나 마우스 이벤트가 발생한 좌표와 객체와의 교차점을 구하기 위해 <a href='https://threejs.org/docs/#api/en/core/Raycaster'>레이캐스트</a>를 사용합니다.

> Raycasting is used for mouse picking (working out what objects in the 3d space the mouse is over) amongst other things.

여기서는 레이캐스트와 관련된 3가지 함정, 혹은 실패 사례를 소개합니다.

### 1. 과하게 개입하는 AxesHelper

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>스틱맨</a>이나 <a href='https://pj-corridor.net/cube3d/cube3d.html'>루빅큐브</a>에서는 `touchstart`나 `mousedown` 이벤트가 발생한 좌표에서의 레이캐스트를 다음과 같은 방식으로 활용합니다.

1. `Scene` 내의 객체와 교차하는 경우  
   - 교차한 파츠를 드래그  
   - `touchmove`나 `mousemove`로 파츠를 조작(예: 포즈 변경)
2. `Scene` 내의 객체와 교차하지 않는 경우  
   - 해당 좌표를 드래그  
   - `touchmove`나 `mousemove`로 객체를 회전(실제로는 객체 자체의 회전이 아니라, 객체를 향해 있는 `PerspectiveCamera`가 이벤트의 반대 방향으로 이동)

이와 같은 UX를 공통적으로 사용하고 있습니다. 하지만 디버깅 목적으로 `Scene`에 `AxesHelper`(축을 나타내는 3색 선)를 추가하면, 의도하지 않은 동작이 발생하는 경우가 있습니다.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/AxesHelper.png' />

그 이유는 `AxesHelper` 자체도 `Raycaster.intersectObject()`(<a href='https://threejs.org/docs/#api/en/core/Raycaster.intersectObject'>사양</a>)의 대상이 되기 때문입니다. 따라서 교차 판정 시 이를 고려하거나, 사전에 `AxesHelper`의 영향을 제외해야 합니다.

```javascript
const children = scene.children.filter(in_child => !(in_child instanceof THREE.AxesHelper));
const intersects = raycaster.intersectObjects(children);
```

### 2. 사라지는 CircleGeometry

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>스틱맨</a>의 파츠 조작은 다음과 같은 구조로 이루어져 있습니다.

1. 파츠를 드래그한 시점에 `Scene`에 조작용 객체를 추가  
   - 대상 파츠의 height와 동일한 반지름을 가진 `SphereGeometry`  
   - 해당 `SphereGeometry`의 중심을 지나고, 법선 벡터가 `PerspectiveCamera`를 향한 `CircleGeometry`
2. `touchmove`나 `mousemove` 이벤트에서 얻은 좌표로 레이캐스트를 수행하고, 조작용 객체와의 교차 방향을 기준으로 드래그한 파츠가 `lookAt()`(<a href='https://threejs.org/docs/#api/en/core/Object3D.lookAt'>사양</a>)을 수행

다음은 디버깅을 위해 조작용 객체에 색을 입히고 스틱맨의 손을 움직이는 모습입니다.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/CircleGeometry.gif' />

공간 내 파츠의 위치에 따라 객체의 반대 방향에서 레이캐스트를 수행하는 경우가 있는데, 이때 의도하지 않은 동작이 발생합니다. 조사해 보니 `SphereGeometry`는 뒷면에서의 레이캐스트와 교차점을 가지지 않는다는 것을 알게 되었습니다. `CircleGeometry`는 항상 `PerspectiveCamera` 쪽을 향하고 있기 때문에, 반대 방향 상황을 놓치기 쉬운 함정이었습니다.

이 경우, 예를 들어

```javascript
const geometry = new THREE.CircleGeometry(100, 32);
const material = new THREE.MeshNormalMaterial({side : THREE.DoubleSide});
const circle = new THREE.Mesh(geometry, material);
```

와 같이 양면 렌더링이 가능한 머티리얼을 사용하면, 반대 방향에서의 레이캐스트에도 대응할 수 있습니다.

### 3. 보이는 것과 다른 SkinnedMesh

<a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>고무 인간</a>이나 <a href='https://pj-corridor.net/stick-figure/hand.html'>손</a>에서는 `SkinnedMesh`를 사용하여 파츠를 부드럽게 구부리고 있습니다. 여기까지는 괜찮지만, 문제는 구부린 파츠가 레이캐스트와 교차점을 가지지 않는다는 점이었습니다. 관련 정보는 <a href='https://threejs.org/docs/#api/en/objects/SkinnedMesh'>사양</a>에 명시되어 있지 않지만, 왜일까요?

포럼과 `SkinnedMesh`의 <a href='https://github.com/mrdoob/three.js/blob/master/src/objects/SkinnedMesh.js'>구현</a>을 조사해 보니, 실제 정점 데이터는 변경하지 않고 본(bone)의 영향을 계산하여 렌더링하고 있다는 것을 이해할 수 있었습니다. 그래서 대략적인 대체 정점 데이터로서 `SkinnedMesh.skeleton.bones`를 사용한 `ExtrudeGeometry`(<a href='https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry'>사양</a>)를 생성하고, 그것과 레이캐스트의 교차점을 드래그하는 방식으로 고무 인간의 조작을 구현할 수 있었습니다.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/rubber-figure.gif' />

## AdSense에서 겪은 브라우저 호환성 문제

Three.js 애플리케이션의 형태가 어느 정도 갖추어지자, 시험 삼아 AdSense를 도입해 보았습니다. 그런데 Three.js 애플리케이션과 AdSense의 공존에서 예상치 못한 난관에 부딪히게 되었습니다. 여기서는 `iframe`과 관련된 브라우저 호환성 문제를 해결하기까지의 과정을 소개합니다.

Three.js 애플리케이션은 초기화 시와 윈도우 리사이즈 시, 적절한 좌표 처리와 렌더링을 위한 설정 변경이 필요합니다.

- `PerspectiveCamera.aspect`(<a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.aspect'>사양</a>)의 변경  
- `PerspectiveCamera.updateProjectionMatrix()`(<a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.updateProjectionMatrix'>사양</a>)의 호출  
- `WebGLRenderer.setSize()`(<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setSize'>사양</a>)의 호출  

또한 <a href='https://support.google.com/adsense/answer/9190028'>AdSense 코드</a>를 설치한 사이트에서는 광고 자동 삽입 시 다른 요소의 크기가 변경될 가능성이 있기 때문에, 그 타이밍에서도 동일한 처리가 필요합니다. 예를 들어 다음과 같이 요소의 `offsetHeight`가 변경됩니다.

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.gif' />

다만 `WebGLRenderer.setSize()`의 <a href='https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js'>구현</a>에는 `WebGLRenderer.domElement`의 `width`나 `height`에 대한 쓰기가 포함되어 있기 때문에, `ResizeObserver`의 콜백 내에서 호출하는 것은 다소 위험해 보입니다 (참고로 <a href='https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/resize_observer/resize_observer.cc'>Chromium의 구현</a>에서는 이전 관찰 시점과 비교하여 요소 크기의 변화를 확인하고 있기 때문에 무한 루프에 빠지지는 않는 것으로 보입니다).

그래서 `iframe` 내부에 `WebGLRenderer.domElement`를 배치함으로써 다음과 같이 대응하는 방법을 생각했습니다.

1. AdSense에 의한 광고 자동 삽입  
2. 이에 따른 `iframe`의 리사이즈  
3. 이에 따른 이벤트 핸들러 처리  
   - `WebGLRenderer.domElement`의 리사이즈  
   - 좌표 처리 및 렌더링을 위한 설정 변경  

```javascript
function createOuterWindow(in_document) {
    const iframe = in_document.createElement('iframe');
    Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none'
    });
    in_document.body.appendChild(iframe);
    return iframe.contentWindow;
}

const outerWin = createOuterWindow(document);
const outerDoc = outerWin.document;

// myCanvas : WebGLRenderer.domElement
outerDoc.body.appendChild(myCanvas);

outerWin.addEventListener('resize', in_event => {
    // maintain PerspectiveCamera.aspect etc
    console.log('resized');
});
```

하지만 Chrome (137.0)에서는 기대한 대로 동작하는 반면, Firefox (139.0)에서는 `WebGLRenderer.domElement`가 표시되지 않습니다. 그래서 처리 타이밍을 변경해 보았습니다. `iframe`의 <a href='https://html.spec.whatwg.org/#the-iframe-element'>사양</a>에 따르면 `src`나 `srcdoc` 속성이 없는 `iframe`은 기본적으로 `about:blank`를 로드하므로

> 3. If url matches about:blank and initialInsertion is true, then: Run the iframe load event steps given element.

이 타이밍은 어떨까요?

```javascript
const outerWin = createOuterWindow(document);

outerWin.addEventListener('load', () => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
});
```

이번에는 Firefox에서는 기대한 대로 동작하지만, Chrome에서는 이벤트가 실행되지 않습니다. 관련 논의는 <a href='https://github.com/whatwg/html/issues/6863'>stop triggering navigations to about:blank on iframe insertion</a>에 있습니다만, 처리를 다음 이벤트 루프까지 지연시키는 것으로 두 브라우저 모두에서 기대한 동작을 얻을 수 있었기 때문에, 일단은 이 방법을 사용하고 주석을 남겨 두었습니다.

```javascript
const outerWin = createOuterWindow(document);

// asynchronous process for Firefox
setTimeout(() => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
}, 0);
```

이로써 좌표 처리와 렌더링을 위한 설정 변경이 광고 자동 삽입에 맞추어 동작하도록 할 수 있게 되었습니다.

## 제 뇌피셜의 결정체인 애니메이션 함수입니다.

AdSense의 도입이 어느 정도 마무리된 시점에서, 마지막으로 전체적인 UX를 개선해 보려고 합니다. Three.js 애플리케이션에서 `WebGLRenderer`의 렌더링은 전반적으로 애니메이션 표현을 사용하고 있지만, 가능하다면 일반적인 HTML 요소의 렌더링(예: 다이얼로그 표시)에서도 동일한 UX를 적용하고 싶습니다. 그렇다고 해서 CSS의 `@keyframes` 정의 등 애니메이션 관련 설정을 여기저기 분산시키고 싶지는 않습니다. JavaScript 코드만으로 단순하게 일원 관리할 수 없을까 고민한 끝에 구현한 것이 아래입니다.

```javascript
function autoTransition1(in_elem, in_shorthand, in_start, in_end) {
    return new Promise(in_resolve => {
        let [prop,,, delay = '0s'] = in_shorthand.split(/\s+/);
        // convert from CSS to CSSOM
        prop = prop.replace(/-([a-z])/g, (in_match, in_letter) => in_letter.toUpperCase());
        delay = delay.includes('ms') ? parseFloat(delay) : parseFloat(delay) * 1000;
        in_elem.style['transition'] = in_shorthand;
        in_elem.style[prop] = in_start;
        // automatically start the transition in the next event loop
        setTimeout(() => in_elem.style[prop] = in_end, delay);
        const callback = in_ev => {
            if (in_ev.propertyName === prop) {
                in_elem.removeEventListener('transitionend', callback);
                (in_resolve)();
            }
        };
        in_elem.addEventListener('transitionend', callback);
    });
}

function autoTransition2(in_elem, in_shorthand, in_start, in_end) {
    (async () => await autoTransition1(in_elem, in_shorthand, in_start, in_end))();
}

autoTransition2(element, 'color 1.5s ease-out', 'blue', 'white');
```

CSS Transitions의 shorthand와 transition-property의 시작 값과 종료 값을 지정함으로써 요소에 대한 애니메이션을 실행합니다.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/dialog.gif' />

## 마무리

여기까지 읽어주셔서 감사합니다. 별도의 소제목으로 다루지는 않았지만, 이 외에도 여러 가지 사소한 실패가 있었습니다. 예를 들어 Three.js의 많은 클래스에는 `clone()` 메서드가 구현되어 있는데, 클래스를 상속하여 새로운 클래스를 구현하면서 생성자의 인터페이스를 변경해 버린 것이 원인이 되어, `clone()`으로 생성된 인스턴스의 이상한 동작에 고민했던 일 등은 지금도 기억에 남는 반성 포인트입니다.

이와 같이, 제가 Three.js 애플리케이션 개발을 통해 얻은 지식(혹은 실패 사례)이 여러분에게 조금이라도 도움이 되었으면 합니다.
