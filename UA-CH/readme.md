# 今は、もう、動かないその User-Agent 文字列

こんにちは、広告エンジニアの中山です。

みなさまの Web アプリケーションでは（大きなのっぽの）User-Agent 文字列を参照するユースケースはありますか？

```
User-Agent: Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.1234.56 Safari/537.36
```

例えば User-Agent 文字列を解析して内容に応じて制御を分岐させたり、機械学習の特徴量として用いたり、さらに一般に悪しきユースケースとされる fingerprinting への活用もあるかもしれません。私の担当する広告サービスでは

- 不正判定のための特徴量
- 属性推定のための特徴量
- その他配信制御（例えばキャリアのターゲティングや特定バージョンのバグ回避など）

といった用途で参照しています。ちなみにキャリアは通常 IP レンジから判定しますが、Wi-Fi 経由のアクセス時には User-Agent 文字列に含まれる情報から判定できる場合もあります。

そんな User-Agent 文字列ですが、この先 Chrome をはじめ幾つかのブラウザで情報量の削減や凍結が進み、従前の目的で利用できなくなる可能性があります。そこで今回は User Agent Client Hints（UA-CH）の仕様を調査しつつ、今後どのように Web アプリケーションで対応すべきかをみなさんと一緒に考えてゆきたいと思います。

また、特に断りのない限り、この記事では Chrome に関する内容を述べているものとします。

## なぜ User-Agent 文字列は情報量を削減され、凍結されるのか？

そうすべきモチベーションとして [以下のように述べられて](https://github.com/WICG/ua-client-hints) います。

> This header's value has grown in both length and complexity over the years; a complicated dance between server-side sniffing to provide the right experience for the right devices on the one hand, and client-side spoofing in order to bypass incorrect or inconvenient sniffing on the other.

長く、そして複雑怪奇な文字列仕様を解消し

> There's a lot of entropy wrapped up in the UA string that is sent to servers by default, for all first- and third-party requests.

あわせて高エントロピー故にユーザー追跡を可能にしてしまう問題 … 冒頭で述べた fingerprinting … を排除するための取り組みだそうす。以下は Google から [案内されているスケジュール](https://www.chromium.org/updates/ua-reduction/) を時間軸にプロットしたものです。表中の黄色のセルは情報量を削減され、凍結されたトークンを示しています。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i04.png' />

## いつ困ることになりそうか？

過ぎ去った

> In Phase 4 we change the <minorVersion> token to "0.0.0".

および

> In Phase 5 we change the <platform> and <oscpu> tokens from their platform-defined values to the relevant <unifiedPlatform> token value (which will never change).

については、広告の例では不正判定や配信制御への影響は考えられるものの、肌感覚としてはそこまで大きな影響はなさそうです。

一方でそれなりの影響がありそうなのは年が明けてからの

> In Phase 6, we change the <deviceModel> token to "K" and change the <androidVersion> token to a static "10" string.

のタイミングとなります。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i05.png' />

ここで ***androidVersion*** が "10" に、そして ***deviceModel*** が "K" に固定されてしまいます。そうなると …

- ***deviceModel*** はデモグラに対する説明力が高い<br />（例えば Disney Mobile on docomo のユーザーは女性である可能性が高そう、など）
- ***deviceModel*** からキャリア判定を行うケースがある
- Mobile の ***androidVersion*** は Desktop の ***unifiedPlatform*** よりもブラックリスト制御やホワイトリスト制御に使われるケースが多い

のような用途に対して影響が生じます。みなさまの Web アプリケーションへの影響はいかがでしょうか？

蛇足ですが Chrome 以外のブラウザについては 2022/09/08 現在では以下のような状況です。

| ブラウザ  | User-Agent 文字列の状況                                       |
| ---       | ---                                                           |
| Edge      | "Edg/" に続く ***minorVersion*** が残存（"0.0.0" ではない）   |
| Safari    | ***unifiedPlatform*** が既に固定されている                    |
| Firefox   | ***unifiedPlatform*** が既に固定されている                    |

## User Agent Client Hints（UA-CH）とは何か

では我々はどのようにこの影響を最小化すべきでしょうか？

結論を先に述べると「[User Agent Client Hints（以降 UA-CH）](https://github.com/WICG/ua-client-hints)」を活用します。

ブラウザはサーバに対して以下のような UA-CH を HTTP Request Header として送信します。

```
sec-ch-ua: "Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
```

 User-Agent とは別に、




タイミングによっては欲しい情報を得られない
100% 情報取得するとパフォーマンスが犠牲になる
将来のプライバシー対策の影響を受ける可能性がある
ブラウザ互換性の維持
サブリソースとサブドメイン


となりますが Web アプリケーションの動作を担保するためにはさらに幾つか検討すべきことがあります。

- 入手できる情報
- 入手できるタイミング
- 入手できるサービス
- 将来のリスク

列挙した観点について User-Agent 文字列の時代と仕様が異なるため、個別に対応方法を検討しましょう。

#### 入手できる情報

Sec-CH-UA
Sec-CH-UA-Mobile
Sec-CH-UA-Platform

Sec-CH-UA-Model


#### 入手できるタイミング

# ハイエントロピー API

https://web.dev/migrate-to-ua-ch/

When processing this on the server-side you should first check if the desired Sec-CH-UA header has been sent and then fallback to the User-Agent header parsing if it is not available.

Cookie も含めたフォールバック

#### 入手できるサービス

ページ、サブリソース

#### 将来のリスク

