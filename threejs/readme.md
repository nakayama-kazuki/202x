# そんな時どうする Three.js アプリ開発

こんにちは、以前は広告エンジニア、現在はデータプラットフォームエンジニアの中山です。この記事では趣味の Three.js アプリ開発を通じて得た気付き、例えば Three.js 固有の落とし穴や AdSense 導入時のトラブルやその解決方法などを共有させていただきます。

最初に Three.js アプリのご紹介です。

## リバーシ

<img src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

リバーシに 3D 必要？と突っ込まれそうですが、シリンダ状にループする盤面で新たなゲーム戦略を楽しめます。加えて DMZ 概念の導入や NPC の選択肢にも幅があり（1～3）、ループ盤面の場合は回転操作も可能です。ルールベース（2025 年 6 月現在）の NPC 実装は一対一で戦う場合は物足りなさを感じるかもしれませんが、カオスな 4 人対決（NPC x3 + 人間）だと経験者でも苦戦すること請け合いです。

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-non-loop'>2 人プレー（NPC x1 + 人間）リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-loop'>2 人プレー（NPC x1 + 人間）ループ盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-non-loop'>4 人プレー（NPC x3 + 人間）リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-loop'>4 人プレー（NPC x3 + 人間）ループ盤面リバーシ</a>

## パズル

<img src='https://pj-corridor.net/images/ix-cube1.png' />

鉄板の Three.js 題材、ルービックキューブを発展させて多様なパズルを開発してみました。

- <a href='https://pj-corridor.net/cube3d/cube3d.html'>通常のルービックキューブ</a>
- <a href='https://pj-corridor.net/cube3d/cube3d.html?level=3'>ピースの形状が変則的なパズル</a>
- <a href='https://pj-corridor.net/cube3d/caterpillar.html'>ピースの回転が変則的なパズル</a>
- <a href='https://pj-corridor.net/cube3d/diamond.html'>ダイヤモンド型のパズル</a>
- <a href='https://pj-corridor.net/cube3d/gemini.html'>双子のルービックキューブ</a>
- <a href='https://pj-corridor.net/side-six/side-six.htmll'>シリンダ型のパズル</a>

## 棒人間

<img src='https://pj-corridor.net/images/ix-figure.png' />

私は <a href='https://lydesign.jp/n/n3aa55611b347'>ポンチ絵を多用したパワポスライド</a> を好んでいますが、スライドに張り付ける著作権フリーな棒人間素材を探すのは少々面倒です。ならばいっそ自前で、と開発したのがこちらです。

- <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間（関節操作で任意のポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間（引っ張ってポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/hand.html'>手（引っ張ってポージング）</a>

## 棒人間ギャラリー

<img src='https://pj-corridor.net/images/figure-gallery.png' />

棒人間は便利でしたが、ポージングすら面倒になり :-p 構造化したポーズデータの I/O とそれを使ったギャラリーを用意しました。イメージに近いものを探して少々整えるだけで目的の棒人間素材が手に入ります。

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>棒人間ギャラリー</a>

ポーズデータにラベルを付け、機械学習を利用して自然言語（例えば感情や姿勢を表す言葉）から適当なポーズを生成する棒人間を将来構想として検討中です。









ヘルプのことも書く






Threejs を使ったアプリケーション開発に関連する技術ブログを書きます。
含める内容としては、実際に開発したアプリケーションの紹介（キューブなどのパズルや 3D 棒人間）と、
その開発を通じて得た Tips の紹介です。Tips には Threejs 固有のものもあればそうでないものもあります。

いくつか例を挙げます。

ex. キューブで実座標を用いて判定を行う方式を採用する場合、回転等で生じる座標の誤差を吸収するためのクラス
ex. Threejs の clone は元の引数を前提にしているので、クラスを拡張した場合でコンストラクタ引数を変えているときは注意
ex. Threejs のキャンバスからは 2D context がとれないが、クリップボードに描画内容をコピーする場合の対応方法
ex. Safari だとトップレベルの await がワークしないなどのブラウザ関連 Tips
ex. Google 広告を付ける場合に要素サイズを変更される等の副作用が発生するがその対処方法

などのエッセンスを紹介して、アプリ開発者の気づきを促す記事にする予定です。
おすすめのタイトルを 10 個考えてみてください。自分が考えたのは「Three.js アプリケーションを作ろう」です。



Three.js アプリケーションの課題解決事例

キューブ系

おおよその構造


棒人間系

おおよその構造



/*
	*** NOTE ***
	when the app uses position of the mesh to find overlapping etc,
	need to ignore very small error.
*/

小さい誤差を無視

/*
	*** NOTE ***
	sometimes can't get 2D context ( ex. Three.js ).
	so, to get it, copy bitmap to alternative canvas.
*/

調べて記載。多分クリップボードの

/*
	*** NOTE ***
	when you use NDC for calculating delta of user interaction like mousemove,
	it will be affected by screen (canvas) size.
	so, you can use this method for the purpose.
*/

NDC を扱いやすくする

/*
	*** NOTE ***
	this.clone() can't be used here.
	at first, this code couldn't work because of it.
	https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js
	in addition, both _cNDCVector2 and Vector2 instances are basically operable at the same time
*/

継承クラスから clone を使って失敗した
https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js

/*
	*** NOTE ***
	when you use AxesHelper,
	// gWorld.add(new THREE.AxesHelper(WORLD_RADIUS));
	gWorld.setZoom() can not work well.
*/

調べて記載。AxesHelper 使うとワークしない機能

/*
	*** NOTE ***
	even if overwritung using black,
	this.#drawGrayLine(this.from, to, 0x00);
	smudge of white line will remain.
*/

残像残るよ

/*
	*** NOTE ***
	in Safari, using await to get audio will cause the process to fail.
	I'm not sure of the reason, but top-level await might be the cause.
	this time use then() to avoid the issue.
*/

調べて記載。Safari だとトップレベルの await がワークしない

/*
	*** NOTE ***
	to fire the transition function,
	the final style should be set in the next event loop.
*/

CSS トランジションを動的に変更する場合

/*
	*** NOTE ***
	without iframe (outer window),
	geometry in event will be wrong because of google ads
*/

Google 広告を付ける場合
・広告挿入で操作不可 : iframe で包んでも再発
・広告挿入で操作不可 : リサイズのオブザーブ（リサイズ無限ループ）

/*
	*** NOTE ***
	although Chrome can use iframe.contentDocument right after createElement,
	Firefox can not use it ant needs to use asynchronous process.
	by the way, if you use not timer but load event,
	your code will not work for Chrome.
*/

Chrome と Firefox で iframe の扱いが違う

/*
	*** NOTE ***
	Safari may restrict sound without user interaction.
	because of this, the sound does not work without this code.
*/

調べて記載。Safari で音を鳴らす場合

/*
	*** NOTE ***
	as CircleGeometry can't catch raycast from opposite side,
	use rotated CircleGeometry in addition.
*/

CircleGeometry は反対からのレイキャストを拾ってくれない

/*
	*** NOTE ***
	vertices of SkinnedMesh.geometry will not be changed after moving bones.
	because of it, SkinnedMesh.geometry can't catch raycasting properly.
	so, to catch raycasting, rough formed geometry is attached.
*/

スキンメッシュがダメなので …

/*
	*** NOTE ***
	an instance does not necessarily have an index.
	so to merge with indexed geometry, mergeVertices should be called.
	https://discourse.threejs.org/t/how-to-get-extrudegeometrys-index/35921
*/

マージが面倒だった

/*
	*** NOTE ***
	before getting betmap, you need re-render.
	without it, for example, you can't use canvas.toDataURL('image/png') etc. 
*/

これも調査。再描画しないとキャプチャとれない理由





