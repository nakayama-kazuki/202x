# そんな時どうする Three.js アプリ開発

こんにちは、以前は広告エンジニア、現在はデータプラットフォームエンジニアの中山です。この記事では趣味の Three.js アプリ開発を通じて得た気付き、例えば Three.js 固有の落とし穴や AdSense 導入時のトラブルやその解決方法などを共有させていただきます。

最初に Three.js アプリをご紹介します。

### リバーシ

<img width='300' src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

リバーシに Three.js 必要？と突っ込まれそうですが、シリンダ状にループする盤面で新たなゲーム戦略を楽しめます。加えて DMZ 概念の導入や NPC の選択肢にも幅があり（1～3）、ループ盤面の場合は回転操作も可能です。ルールベース（2025 年 6 月現在）の NPC 実装は一対一で戦う場合は物足りなさを感じるかもしれませんが、カオスな 4 人対決（NPC x3 + 人間）だと経験者でも苦戦すること請け合いです。よろしければ電車の待ち時間に遊んでください。

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-non-loop'>2 人プレー（NPC x1 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-loop'>2 人プレー（NPC x1 + 人間）ループ盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-non-loop'>4 人プレー（NPC x3 + 人間）通常盤面リバーシ</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-loop'>4 人プレー（NPC x3 + 人間）ループ盤面リバーシ</a>

### パズル

<img width='300' src='https://pj-corridor.net/images/ix-cube1.png' />

鉄板の Three.js 題材、ルービックキューブを発展させて多様なパズルを開発してみました。

- <a href='https://pj-corridor.net/cube3d/cube3d.html'>通常のルービックキューブ</a>
- <a href='https://pj-corridor.net/cube3d/cube3d.html?level=3'>ピースの形状が変則的なパズル</a>
- <a href='https://pj-corridor.net/cube3d/caterpillar.html'>ピースの回転が変則的なパズル</a>
- <a href='https://pj-corridor.net/cube3d/diamond.html'>ダイヤモンド型のパズル</a>
- <a href='https://pj-corridor.net/cube3d/gemini.html'>双子のルービックキューブ</a>
- <a href='https://pj-corridor.net/side-six/side-six.htmll'>シリンダ型のパズル</a>

### 棒人間

<img width='300' src='https://pj-corridor.net/images/ix-figure.png' />

私はしばしば <a href='https://lydesign.jp/n/n3aa55611b347'>ポンチ絵を多用したパワポスライド</a> を作ることがありますが、スライドに張り付ける著作権フリーな棒人間素材を探すのは少々面倒です。ならばいっそ自前で、と開発したのがこちらです。みなさまのスライドにも是非ご利用ください。

- <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>棒人間（関節操作で任意のポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>ゴム人間（引っ張ってポージング）</a>
- <a href='https://pj-corridor.net/stick-figure/hand.html'>手（引っ張ってポージング）</a>

### 棒人間ギャラリー

<img width='300' src='https://pj-corridor.net/images/figure-gallery.png' />

棒人間は便利でしたが、ポージングすら面倒になり :-p 構造化したポーズデータの I/O とそれを使ったギャラリーを用意しました。イメージに近いものを探して少々整えるだけで目的の棒人間素材が手に入ります。

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>棒人間ギャラリー</a>

次のステップとして、ポーズデータにラベルを付け、機械学習を利用して自然言語（例えば感情や姿勢を表す言葉）から適当なポーズを生成する棒人間を構想中です。

## ブラウザ互換と格闘

ここからはアプリ開発を通じて得た気付きをご共有します。

最近はメジャーブラウザ互換に悩むことが少なくなりましたが（10 年くらい前は結構多かった）、サイトに AdSense を導入したところ久しぶりにブラウザ互換と格闘することになりました。ご覧の通り AdSense は DOM 構造の変更を伴う広告の自動挿入を実行します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.png' />

Three.js アプリは CANVAS のサイズに応じた

- Camera の aspect の変更
- Camera の updateProjectionMatrix() 呼び出し
- WebGLRenderer の setSize() 呼び出し

が必要ですが、

最近はメジャーブラウザ間の動作相違に悩むことが少なくなりましたが（10 年くらい前は結構多かった印象）、試しに AdSense を導入したところ、広告の自動挿入で CANVAS の座標系が狂ってしまう問題が発生し、回避のために iframe を利用したものの Chrome と Firefox で動作相違が生じてまあまあ苦戦しました。前者は createElement 直後から同期的に contentDocument を操作できたのですが、後者ではそれがワークしません。後者のために load イベントハンドラ + await を導入してみたものの、今度は前者で load イベントが発生しません。タイマー + await でイベントループ処理を一周遅延させることで両ブラウザで期待動作が得られました。このあたりのネタを myTips か techblog にまとめたいと思ってます ^^

★
Google 広告の掲載
・広告挿入で操作不可 : iframe で包んでも再発
・広告挿入で操作不可 : リサイズのオブザーブ（リサイズ無限ループ）
although Chrome can use iframe.contentDocument right after createElement,
Firefox can not use it ant needs to use asynchronous process.
by the way, if you use not timer but load event,
your code will not work for Chrome.

## SkinnedMesh と Raycaster

スキンメッシュがダメなので …
vertices of SkinnedMesh.geometry will not be changed after moving bones.
because of it, SkinnedMesh.geometry can't catch raycasting properly.
so, to catch raycasting, rough formed geometry is attached.

★ミス
as CircleGeometry can't catch raycast from opposite side,
use rotated CircleGeometry in addition.
CircleGeometry は反対からのレイキャストを拾ってくれない

## WebGLRenderer

★そういう仕様か
これも調査。再描画しないとキャプチャとれない理由
before getting betmap, you need re-render.
without it, for example, you can't use canvas.toDataURL('image/png') etc. 

## CSS Transitions の変更

★CSS トランジションを動的に変更したい場合
to fire the transition function,
the final style should be set in the next event loop.

## 継承 + clone()

★コレの再確認
クラス拡張でコンストラクタ引数を変更している場合の clone メソッド
継承クラスから clone を使って失敗した
https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js

