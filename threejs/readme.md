# そんな時どうする Three.js アプリ開発

こんにちは、以前は広告エンジニア、現在はデータプラットフォームエンジニアの中山です。この記事では趣味の Three.js アプリ開発を通じて得た気付き、例えば Three.js 初心者が陥りそうなトラブルやブラウザ互換問題、それらの解決方法についてご紹介させていただきます。なお、TECHSCORE BLOG への掲載ですが、以前シナジーマーケティングでご一緒させて頂いたこともありご快諾いただけました ^^ どうもありがとうございます。

最初に Three.js アプリをご紹介します。

### 新コンセプトのリバーシ

<img width='300' src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

リバーシに Three.js 必要？と突っ込まれそうですが、シリンダ状にループする 3D 盤面で従前にはない戦略を楽しめます。加えて DMZ 概念の導入や NPC の選択肢にも幅があり（1～3）、ループ盤面の場合は回転戦術も選択できます。ルールベース（2025 年 6 月現在）の NPC 実装は一対一で戦う場合は物足りなさを感じるかもしれませんが、カオスな 4 人対決（NPC x3 + 人間）だと経験者でも苦戦すること請け合いです。よろしければ電車の待ち時間に遊んでください。

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-non-loop'>2 人プレー（NPC x1 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-loop'>2 人プレー（NPC x1 + 人間）ループ盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-non-loop'>4 人プレー（NPC x3 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-loop'>4 人プレー（NPC x3 + 人間）ループ盤面リバーシ</a>

### 多様なパズル

<img width='300' src='https://pj-corridor.net/images/ix-cube1.png' />

鉄板の Three.js 習作題材、ルービックキューブを発展させて多様なパズルを開発してみました。

- <a href='https://pj-corridor.net/cube3d/cube3d.html'>通常のルービックキューブ</a>
- <a href='https://pj-corridor.net/cube3d/cube3d.html?level=3'>ピースの形状が変則的なキューブ</a>
- <a href='https://pj-corridor.net/cube3d/caterpillar.html'>ピースの回転が変則的なキューブ</a>
- <a href='https://pj-corridor.net/cube3d/diamond.html'>ダイヤモンド型のパズル</a>
- <a href='https://pj-corridor.net/cube3d/gemini.html'>双子のキューブ</a>
- <a href='https://pj-corridor.net/side-six/side-six.htmll'>シリンダ型のパズル</a>

### 棒人間

<img width='300' src='https://pj-corridor.net/images/ix-figure.png' />

私は <a href='https://lydesign.jp/n/n3aa55611b347'>ポンチ絵を多用したパワポスライド</a> を作ることがありますが、スライドに張り付ける著作権フリーな棒人間素材を探すのは少々面倒です。ならばいっそ自前で、と開発したのがこちらです。みなさまのスライドにも是非ご利用ください。

- <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間（関節操作のポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間（曲げて引っ張るポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/hand.html'>手（曲げて引っ張るポージング）</a>

### 棒人間ギャラリー

<img width='300' src='https://pj-corridor.net/images/figure-gallery.png' />

棒人間は便利でしたが、ポージングすら面倒になり :-p 構造化したポーズデータの入出力とそれを使ったギャラリーを用意しました。イメージに近いものを探して少々整えるだけで目的の棒人間素材が手に入ります。

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>棒人間ギャラリー</a>

次のステップとして、ポーズデータにラベルを付け、機械学習を利用して自然言語（例えば感情や姿勢を表す言葉）から適当なポーズを生成する棒人間を構想中です。

さて、ここからは Three.js アプリ開発を通じて得た気付きのご紹介です。

## AdSense が招くブラウザ互換問題

最近は主要ブラウザ間の互換性に悩むことが少なくなりましたが、サイトに AdSense を導入したところ iframe に関連したブラウザ互換問題に直面しました。その解消までの道のりをご紹介します。

Three.js アプリは初期化時とウインドウのリサイズ時、適切なレンダリングや座標処理のための設定変更 …

- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.aspect'>PerspectiveCamera.aspect</a> の変更
- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.updateProjectionMatrix'>PerspectiveCamera.updateProjectionMatrix()</a> 呼び出し
- <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setSize'>WebGLRenderer.setSize()</a> 呼び出し

が必要になります。加えて <a href='https://support.google.com/adsense/answer/9190028'>AdSense コード</a> を設置したサイトで、広告自動挿入時に要素のサイズが変更される可能性があるため、そのタイミングでも同様の処理が必要になります。例えばこれは要素の offsetHeight が変更されています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.gif' />

ただし <a href='https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js'>WebGLRenderer.setSize() の実装</a> には <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.domElement'>WebGLRenderer.domElement</a> の width や height への書き込みがあるため、ResizeObserver のコールバック内で呼び出すことは少々危うい感じもします（余談ですが <a href='https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/resize_observer/resize_observer.cc'>Chromium の実装</a> では前回観察時からの要素サイズの変更を確認しているので、意図せず処理がループしてしまうことはありません）

そこで iframe 内に WebGLRenderer.domElement を配置することで

1. 広告自動挿入
2. 広告自動挿入に伴う iframe のリサイズ
3. iframe 内の WebGLRenderer.domElement のリサイズ
4. iframe のリサイズに伴うイベントハンドラ処理でレンダリングや座標処理のための設定変更

のように対応することを考えました。

```
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

ところが Chrome（137.0）では動作するものの Firefox（139.0）ではエラーメッセージは出力されないものの WebGLRenderer.domElement が表示されません。ならば src や srcdoc 属性のない iframe はデフォルトの about:blank がロードされるため <a href='https://html.spec.whatwg.org/#the-iframe-element'>iframe の仕様</a>

> 3. If url matches about:blank and initialInsertion is true, then: Run the iframe load event steps given element.

に従って load イベントでの処理を試してみます。

```
const outerWin = createOuterWindow(document);

outerWin.addEventListener('load', () => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
});
```

結果 Firefox では動作するようになりましたが、今度は Chrome で load イベントが実行されません（about:blank の load を同期的に実行し、イベントは発生させない仕様だろうか）。

ブラウザ毎に処理を分岐させてもよいのですが、できるなら同じコードを動かしたいですよね。最終的に Firefox の同期的な iframe.contentWindow.document 操作の失敗は、処理を次回イベントループまで遅延させる形で解消できたので、保守用のコメントを残しておきました。

```
const outerWin = createOuterWindow(document);

// asynchronous process for Firefox
setTimeout(() => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
}, 0);
```

これでようやく両ブラウザともに広告の自動挿入タイミングで PerspectiveCamera や WebGLRenderer の更新ができるようになりました。

## toDataURL() 空しく描画バッファはもぬけの殻

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/screenshot.gif' />

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> や <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間</a> や <a href='https://pj-corridor.net/stick-figure/hand.html'>手</a> では決定したポーズの画像をクリップボードにコピーする screenshot 機能を実装しています。この機能で WebGLRenderer.domElement.toDataURL() を使っていますが、当初これがうまくいかずに悩みました。

例えばこのようなコードの場合

```
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

// (1)
console.log(renderer.domElement.toDataURL('image/png'));

setTimeout(() => {
    // (2)
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);
```

コメント (1) のタイミングでは toDataURL() で期待した出力が得られますが (2) のタイミングではうまくいきません。これは WebGLRenderer が各フレームのレンダリング後に自動的に描画バッファを消去するためです。そこで実験的に描画バッファの保持を WebGLRenderingContext に設定してみます。

```
const renderer = new THREE.WebGLRenderer({preserveDrawingBuffer : true});
```

その結果、非同期的に呼び出される (2) のタイミングでも toDataURL() で期待した出力を得ることができました。ただし <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.preserveDrawingBuffer'>WebGLRenderer.preserveDrawingBuffer</a> はメモリ使用量を最適化するため、フレーム合成などの特定のユースケースを除きデフォルトの false を変更せず、代わりに toDataURL() の直前で再度レンダリングすることにします。

```
setTimeout(() => {
    // (2)
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);
```
これで無事 screenshot 機能が実装できました（パワポスライドへの貼り付け、お試しください ^^）。

## ぼくのかんがえたさいきょうのアニメーション関数

Three.js アプリでの WebGLRenderer の描画は全体的にアニメーション表現を採用していますが、どうせなら通常の HTML 要素の描画（例えばダイアログ表示）でも同様の UX を採用したいですよね。とはいえ CSS の @keyframes 定義などアニメーションに関する記述を分散させたくありません。シンプルな記述でかつ JavaScript コードのみで一元的に管理できないかと考えた末の実装がこちらです。

```
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

CSS Transitions の shorthand と transition-property の開始値と終了値を指定することで要素に関するアニメーションを実行します。

## Raycasting の罠

Three.js アプリでは touch や mouse などのイベントを処理する際に <a href='https://threejs.org/docs/#api/en/core/Raycaster'>Raycasting</a> を使うことがあります。

> Raycasting is used for mouse picking (working out what objects in the 3d space the mouse is over) amongst other things.

この処理に関連した失敗を幾つかご紹介します。

### 1. でしゃばる AxesHelper

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> や <a href='https://pj-corridor.net/cube3d/cube3d.html'>ルービックキューブ</a> では、イベントの開始座標からの Raycasting が …

- オブジェクトと交点を持つ場合、オブジェクト自体を操作（例えばポーズの変更）する
- オブジェクトと交点を持たない場合、その座標を起点としてオブジェクトを回転させる（実際にはオブジェクト自身の回転ではなく、オブジェクト方向に向けた PerspectiveCamera を球面上で移動）

… を共通の UI としていました。しかし、デバッグ目的で Scene に AxesHelper（軸を表す三色の線）を追加した際に何故だか期待動作となりません。

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/AxesHelper.png' />

この理由は AxesHelper 自身も <a href='https://threejs.org/docs/#api/en/core/Raycaster.intersectObject'>Raycaster.intersectObject()</a> の対象となるためでした。交点チェック時に対象を確認するか、その手前で AxesHelper の影響を排除しておきましょう。

```
const children = scene.children.filter(in_child => !(in_child instanceof THREE.AxesHelper));
const intersects = raycaster.intersectObjects(children);
```

### 2. 消えた PlaneGeometry

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> のパーツを操作する際には、透明色の

- 対象パーツの height と同じ半径を持つ SphereGeometry
- その SphereGeometry の中心を通る CircleGeometry

を Scene に追加し、イベント座標からの Raycasting との交点方向にパーツを <a href='https://threejs.org/docs/#api/en/core/Object3D.lookAt'>lookAt()</a> しています。こちらはデバッグ用に SphereGeometry と CircleGeometry を着色し、棒人間の頭を傾けている様子です。

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/PlaneGeometry.png' />

★コード
★アニメ GIF 化する？







★サークルもコード実験


問題点: PlaneGeometry が背面からの Raycasting をキャッチしない。

解決策: CircleGeometry も同様に裏面からのレイキャストを拾いません。この問題を解決するためには、PlaneGeometry や CircleGeometry を回転させて、両面でキャッチできるようにするか、もしくは両面のマテリアルを使用します。

const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), material);

as CircleGeometry can't catch raycast from opposite side,
use rotated CircleGeometry in addition.
CircleGeometry は反対からのレイキャストを拾ってくれない

### 3. SkinnedMesh

問題点: 曲げたあとに Raycasting をキャッチしない問題。

解決策: SkinnedMesh のボーンを動かしても、geometry の頂点は更新されないため、正しくレイキャストをキャッチできません。この問題を解決するためには、レイキャスト用に簡略化した形状を別に用意し、それを使ってレイキャストを行います。

vertices of SkinnedMesh.geometry will not be changed after moving bones.
because of it, SkinnedMesh.geometry can't catch raycasting properly.
so, to catch raycasting, rough formed geometry is attached.

// スキンメッシュとは別に、シンプルなジオメトリを用意してレイキャストを行う
const simplifiedGeometry = new THREE.BoxGeometry(1, 1, 1); // 例: ボックスジオメトリ
const simplifiedMesh = new THREE.Mesh(simplifiedGeometry, someMaterial);
scene.add(simplifiedMesh);



## 継承 + clone()

★コレの再確認
クラス拡張でコンストラクタ引数を変更している場合の clone メソッド
継承クラスから clone を使って失敗した
https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js

