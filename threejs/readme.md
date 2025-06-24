# そんな時どうする Three.js アプリ開発

こんにちは、以前は広告エンジニア、現在はデータプラットフォームエンジニアの中山です。この記事では趣味の Three.js アプリ開発を通じて得た気付き、例えばブラウザ互換問題や Three.js 初心者が陥りそうなトラブル、その解決方法についてご紹介させていただきます（以前シナジーマーケティングでご一緒させて頂いたこともあり、TECHSCORE BLOG への掲載をご快諾いただきました ^^ どうもありがとうございます）。

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

さて、ここからはアプリ開発を通じて得た気付きのご紹介です。

## ブラウザ互換と格闘

最近は主要ブラウザ間の互換性に悩むことが少なくなりましたが、サイトに AdSense を導入したところ久しぶりに互換性の問題に直面しました。その際の記録をご紹介します。

Three.js アプリは適切なレンダリングやイベント処理のために、初期化時とウインドウの resize イベント発生時に

- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.aspect'>PerspectiveCamera.aspect</a> プロパティーの変更
- <a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.updateProjectionMatrix'>PerspectiveCamera.updateProjectionMatrix()</a> メソッド呼び出し
- <a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setSize'>WebGLRenderer.setSize()</a> メソッド呼び出し

が必要です。加えて AdSense の広告自動挿入時にブラウザの top-level browsing context（以降メインウインドウと呼びます）内の要素サイズが変更される可能性があるため（こちらの例だと offsetHeight を変更）、そのタイミングでも同様の処理が必要になります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.gif' />

しかし <a href='https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js'>WebGLRenderer.setSize() 処理</a> で WebGLRenderer.domElement の width や height を更新するため、ResizeObserver による検知は採用できません。そこで、メインウインドウではなく iframe 内に WebGLRenderer.domElement を表示し、その iframe ウインドウの resize イベントハンドラに処理を集約することで、広告自動挿入に対応することを考えました。

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

ところが Chrome（137.0）では動作するものの Firefox（139.0）では WebGLRenderer.domElement が表示されません。この iframe は src 属性を持たないためデフォルトの about:blank がロードされますが <a href='https://html.spec.whatwg.org/#the-iframe-element'>iframe 仕様</a> によれば

> 3. If url matches about:blank and initialInsertion is true, then: Run the iframe load event steps given element.

とのことで load イベントでの処理を試してみます。

```
const outerWin = createChildWindow(document);

outerWin.addEventListener('load', () => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
});
```

今度は逆に Firefox では動作するものの Chrome で WebGLRenderer.domElement が表示されません（Chrome では about:blank の load を同期的に実行し、イベントを発生させないのかもしれません）。

ブラウザ毎に処理を分岐させてもよいのですが、できるなら同じコードを動かしたいですよね。そこで、同期的な iframe.contentWindow.document の操作に失敗する Firefox への対応で処理を次回イベントループまで遅延させ、言い訳をコメントとして残すことにしました。

```
const outerWin = createChildWindow(document);

// asynchronous process for Firefox
setTimeout(() => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
}, 0);
```

これでようやく両ブラウザともに広告の自動挿入タイミングで PerspectiveCamera や WebGLRenderer の更新ができるようになりました。

## WebGLRenderer

★そういう仕様か
これも調査。再描画しないとキャプチャとれない理由
before getting betmap, you need re-render.
without it, for example, you can't use canvas.toDataURL('image/png') etc. 



## シンプルアニメーション

★Chrome でリロード時は実行されるがロード時は実行されない

```
export function autoTransition(in_elem, in_shorthand, in_start, in_end, in_callback = null) {
    let [prop,,, delay = '0s'] = in_shorthand.split(/\s+/);
    // convert from CSS to CSSOM
    prop = prop.replace(/-([a-z])/g, (in_match, in_letter) => in_letter.toUpperCase());
    delay = delay.includes('ms') ? parseFloat(delay) : parseFloat(delay) * 1000;
    in_elem.style['transition'] = in_shorthand;
    in_elem.style[prop] = in_start;
    // automatically start the transition in the next event loop
    setTimeout(() => in_elem.style[prop] = in_end, delay);
    if (in_callback) {
        const callback = in_ev => {
            if (in_ev.propertyName === prop) {
                in_elem.removeEventListener('transitionend', callback);
                (in_callback)();
            }
        };
        in_elem.addEventListener('transitionend', callback);
    }
}

autoTransition(dialog, 'color 1.5s ease-out', 'blue', 'white');
```


## Raycasting が届かない！？
## SkinnedMesh と Raycaster

スキンメッシュがダメなので …
vertices of SkinnedMesh.geometry will not be changed after moving bones.
because of it, SkinnedMesh.geometry can't catch raycasting properly.
so, to catch raycasting, rough formed geometry is attached.

★ミス
as CircleGeometry can't catch raycast from opposite side,
use rotated CircleGeometry in addition.
CircleGeometry は反対からのレイキャストを拾ってくれない



## 継承 + clone()

★コレの再確認
クラス拡張でコンストラクタ引数を変更している場合の clone メソッド
継承クラスから clone を使って失敗した
https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js

