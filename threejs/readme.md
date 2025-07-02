# そんな時どうする Three.js アプリ開発

こんにちは、以前は広告エンジニア、現在はデータプラットフォームエンジニアの中山です。この記事では趣味の Three.js アプリ開発を通じて得た気付き、例えば Three.js 初心者が陥りそうなトラブルやブラウザ互換問題、それらの解決方法についてご紹介させていただきます。なお、以前シナジーマーケティングでご一緒させて頂いたこともあり、TECHSCORE BLOG への記事掲載についてご快諾いただきました ^^ どうもありがとうございます。

最初に Three.js アプリをご紹介します。

### 新コンセプトのリバーシ

<img width='300' src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

リバーシに Three.js 必要？と突っ込まれそうですが、シリンダ状にループする 3D 盤面で従来にはなかった戦略を楽しめます。加えて DMZ 概念の導入や NPC の選択肢にも幅があり（1～3）、ループ盤面の場合は回転戦術も選択できます。ルールベース（2025 年 6 月現在）の NPC 実装は一対一で戦う場合は物足りなさを感じるかもしれませんが、カオスな 4 人対決（NPC x3 + 人間）だと経験者でも苦戦すること請け合いです。よかったら電車の待ち時間に遊んでください。

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-non-loop'>2 人プレー（NPC x1 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-loop'>2 人プレー（NPC x1 + 人間）ループ盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-non-loop'>4 人プレー（NPC x3 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-loop'>4 人プレー（NPC x3 + 人間）ループ盤面リバーシ</a>

### 多様なパズル

<img width='300' src='https://pj-corridor.net/images/ix-cube1.png' />

鉄板の Three.js 習作題材、ルービックキューブを発展させて多様なパズルを開発してみました。とはいえ <a href='https://www.youtube.com/@Z3Cubing'>Z3Cubing</a> に比べればまだまだです。今後は物理的なガジェットでは実現できない方向性（<a href='https://pj-corridor.net/cube3d/caterpillar.html'>変則的な回転</a> はその一例）を探求してゆきます。

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

棒人間で素材探しの課題は解決できましたが、ポージングすら面倒になり :-p 構造化したポーズデータの入出力とそれを使ったギャラリーを用意しました。イメージに近いものを探して少々整えるだけで目的の棒人間素材を入手できます。

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>棒人間ギャラリー</a>

次のステップとして、ポーズデータにラベルを付け、機械学習を利用して自然言語（例えば感情や姿勢を表す言葉）から適当なポーズを生成する棒人間を構想中です。

さて、ここからは Three.js アプリ開発を通じて得た気付きのご紹介です。

## 描画バッファはもぬけの殻

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/screenshot.gif' />

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> や <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間</a> や <a href='https://pj-corridor.net/stick-figure/hand.html'>手</a> では決定したポーズの画像をクリップボードにコピーする screenshot 機能を実装しています。この機能で WebGLRenderer.domElement.toDataURL() を使っていますが、当初描画した画像を取得できずに悩んでいました。

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

button.addEventListener('click', in_ev => {
    // (3)
    console.log(renderer.domElement.toDataURL('image/png'));
});

```

コードの (1) のタイミングでは toDataURL() で期待した出力が得られますが (2) や (3) のタイミングではうまくいきません。この理由は WebGLRenderer が、各フレームのレンダリング後に自動的に描画バッファを消去してしまうためでした。試しに <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.preserveDrawingBuffer'>WebGLRenderer.preserveDrawingBuffer</a> で描画バッファを保持する設定にしてみると

```
const renderer = new THREE.WebGLRenderer({preserveDrawingBuffer : true});
```

非同期的に呼び出される (2) や (3) のタイミングでも期待した出力を得ることができます。ただし <a href='https://registry.khronos.org/webgl/specs/latest/1.0/'>WebGL Specification</a> によれば

> While it is sometimes desirable to preserve the drawing buffer, it can cause significant performance loss on some platforms. Whenever possible this flag should remain false and other techniques used.

との non-normative があり、過去には WebKit で関連するバグも報告されていたため、描画バッファの設定はデフォルト値 false を変更せず toDataURL() の直前で再度レンダリングすることにします。

```
setTimeout(() => {
    // (2)
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);

button.addEventListener('click', in_ev => {
    // (3)
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
});
```
これで無事 screenshot 機能が実装できました。パワポスライドへの貼り付けをお試しください。

## Raycasting の罠 3 選

Three.js アプリでは touch や mouse イベントが発生した座標と、オブジェクトとの交点を求めるために <a href='https://threejs.org/docs/#api/en/core/Raycaster'>Raycasting</a> を使います。

> Raycasting is used for mouse picking (working out what objects in the 3d space the mouse is over) amongst other things.

ここでは Raycasting 関連の 3 つの罠 … あるいは失敗 … をご紹介します。

### 1. でしゃばる AxesHelper

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> や <a href='https://pj-corridor.net/cube3d/cube3d.html'>ルービックキューブ</a> では、touchstart や mousedown イベントが発生した座標からの Raycasting が …

1. Secen 内のオブジェクトと交点を持つ場合
   - 交点を持つパーツをドラッグする
   - touchmove や mousemove でパーツを操作（例えばポーズの変更）
2. Secen 内のオブジェクトと交点を持たない場合
   - その座標をドラッグする
   - touchmove や mousemove でオブジェクトを回転（実際にはオブジェクト自身の回転ではなく、オブジェクトを lookAat() し続ける PerspectiveCamera が touchmove や mousemove イベントの反対方向に移動する）

… を共通の UX としています。しかしデバッグ目的で Scene に AxesHelper（軸を表す三色の線）を追加した際、まれに怪しい挙動になります。

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/AxesHelper.png' />

この理由は AxesHelper 自身も <a href='https://threejs.org/docs/#api/en/core/Raycaster.intersectObject'>Raycaster.intersectObject()</a> の対象となるためでした。それを考慮して交点をチェックするか、チェック手前で AxesHelper の影響を排除しておきましょう。

```
const children = scene.children.filter(in_child => !(in_child instanceof THREE.AxesHelper));
const intersects = raycaster.intersectObjects(children);
```

### 2. 消える CircleGeometry

<a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間</a> のパーツ操作は

1. パーツをドラッグしたタイミングで Scene に操作用のオブジェクトを追加
   - 対象パーツの height と同じ半径を持つ SphereGeometry
   - その SphereGeometry の中心を通り法線ベクトルが PerspectiveCamera を向いた CircleGeometry
2. touchmove や mousemove イベントが発生した座標からの Raycasting と操作用のオブジェクトの交点方向を、ドラッグしたパーツが <a href='https://threejs.org/docs/#api/en/core/Object3D.lookAt'>lookAt()</a> する

のような仕組みになっています。デバッグ用に操作用のオブジェクトを着色し、棒人間の手を動かしている様子をご覧ください。

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/CircleGeometry.gif' />

空間内のパーツの位置に応じて、オブジェクトの反対方向から Raycasting することもあるのですが、その状況で怪しい挙動になります。調べたところ SphereGeometry は背面からの Raycasting と交点を持たないことがわかりました。常に PerspectiveCamera 側を向いている CircleGeometry だけに盲点でした ^^;

この場合、例えば

```
const geometry = new THREE.CircleGeometry(100, 32);
const material = new THREE.MeshNormalMaterial({side : THREE.DoubleSide});
const circle = new THREE.Mesh(geometry, material);
```

のように両面のマテリアルを使用することで対応できます。

### 3. 見た目と異なる SkinnedMesh

<a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間</a> や <a href='https://pj-corridor.net/stick-figure/hand.html'>手</a> では SkinnedMesh を使ってパーツを滑らかに曲げています。ここまではよいのですが、問題は曲げたパーツが Raycasting と交点を持たないことでした。それらしき情報は <a href='https://threejs.org/docs/#api/en/objects/SkinnedMesh'>ドキュメント</a> に記載がありませんが … 何故だろう。

フォーラムや <a href='https://github.com/mrdoob/three.js/blob/master/src/objects/SkinnedMesh.js'>SkinnedMesh の実装</a> を調べ、実際の頂点データは変更せずにボーンの影響を計算～描画していることは理解できました。そこでラフな代替頂点データとして SkinnedMesh.skeleton.bones を使った ExtrudeGeometry を作り、それと Raycasting との交点をドラッグすることでゴム人間の操作を実現できました。

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/rubber-figure.gif' />

## AdSense で踏んだブラウザ互換問題

Three.js アプリの体裁が整ってきたところで、試しに AdSense を導入することにしました。ところが Three.js アプリと AdSense の共存で予想外のハードルに直面してしまいました。ここでは iframe に関連したブラウザ互換問題解消までの道のりをご紹介します。

Three.js アプリは初期化時とウインドウのリサイズ時、適切な座標処理とレンダリングのための設定変更 …

- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.aspect'>PerspectiveCamera.aspect</a> の変更
- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.updateProjectionMatrix'>PerspectiveCamera.updateProjectionMatrix()</a> 呼び出し
- <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setSize'>WebGLRenderer.setSize()</a> 呼び出し

が必要になります。加えて <a href='https://support.google.com/adsense/answer/9190028'>AdSense コード</a> を設置したサイトで、広告自動挿入時に他の要素のサイズが変更される可能性があるため、そのタイミングでも同様の処理が必要になります。例えばこれは要素の offsetHeight が変更されています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.gif' />

ただし <a href='https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js'>WebGLRenderer.setSize() の実装</a> に <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.domElement'>WebGLRenderer.domElement</a> の width や height への書き込みがあるため、ResizeObserver のコールバック内で呼び出すのは少々危うい感じもします（ちなみに <a href='https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/resize_observer/resize_observer.cc'>Chromium の実装</a> では前回観察時からの要素サイズの変化を確認しているので、処理が無限ループに陥ることはないようです）

そこで iframe 内に WebGLRenderer.domElement を配置することで

1. AdSense による広告自動挿入
2. 上記に伴う iframe のリサイズ
3. 上記に伴うイベントハンドラ処理
   - WebGLRenderer.domElement のリサイズ
   - 座標処理とレンダリングのための設定変更

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

ところが Chrome（137.0）では期待動作となるものの、Firefox（139.0）では WebGLRenderer.domElement が表示されません。そこで、処理タイミングを変えて試してみます。<a href='https://html.spec.whatwg.org/#the-iframe-element'>iframe の仕様</a> によれば src や srcdoc 属性のない iframe はデフォルトの about:blank をロードするので

> 3. If url matches about:blank and initialInsertion is true, then: Run the iframe load event steps given element.

このタイミングはどうでしょうか。

```
const outerWin = createOuterWindow(document);

outerWin.addEventListener('load', () => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
});
```

今度は Firefox では期待動作となるものの、Chrome ではイベントが実行されません。関連議論が <a href='https://github.com/whatwg/html/issues/6863'>stop triggering navigations to about:blank on iframe insertion</a> にありますが、処理を次回イベントループまで遅延させることで両ブラウザともに期待動作に至ったため、いったんはこれで良しとしてコメントを残しておきます。

```
const outerWin = createOuterWindow(document);

// asynchronous process for Firefox
setTimeout(() => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
}, 0);
```

これでようやく座標処理とレンダリングのための設定変更 … が広告自動挿入に追従できるようになりました。

## ぼくのかんがえたさいきょうのアニメーション関数

AdSense の導入が一段落したところで、最後に全体的に UX をブラッシュアップしたいと思います。Three.js アプリでの WebGLRenderer の描画は全体的にアニメーション表現を採用していますが、どうせなら通常の HTML 要素の描画（例えばダイアログ表示）でも同様の UX を採用したいですよね。とはいえ CSS の @keyframes 定義などアニメーションに関する記述を分散させたくありません。JavaScript コードのみでシンプルに一元的に管理できないかと考えた末の実装がこちらです。

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

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/dialog.gif' />

## おわりに

ここまで読んでいただきどうもありがとうございます。見出しにはしませんでしたが、他にも細かい失敗がいろいろとありました。例えば Three.js の多くのクラスには clone() メソッドが実装されていますが、クラスを継承した新しいクラスを実装した際、constructor の I/F を変更していたことが理由で clone() したインスタンスの怪しい挙動に悩まされた、などは恥ずかしい限りです。

というわけで、私の Three.js アプリ開発を通じて得た気付き（失敗？）が皆さまにとって有益な情報になれば何よりです。
