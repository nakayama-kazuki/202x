# 今はもう動かない User-Agent 文字列

こんにちは、広告エンジニアの中山です。

みなさまの Web アプリケーションでは User-Agent 文字列を解析して、その内容に応じて制御を分岐させるケースはありますか？

また、それはどのような目的の制御でしょうか。

私の担当する広告の場合は

- 不正判定（User-Agent 文字列やその他のリクエストに含まれるシグナルからロボットの可能性をスコアリング）
- キャリア、デバイス、ブラウザ種別や OS に応じた配信制御（例えば特定のバージョンのバグを回避）

などを行ってます。

後者について補足すると、キャリアは IP レンジからの判定に加え、User-Agent 文字列に含まれるモデル名称から判定する場合もあります。

そこで今回は従来同様に User-Agent 文字列が使えなくなってしまう未来を想定しつつ User Agent Client Hints（UA-CH）の仕様を調査し、今後どのように Web アプリケーションで対応すべきかをみなさんと一緒に考えてゆきたいと思います。

また、特に断りのない限り、この記事では Chrome に関する内容を述べているものとします。

## User-Agent 文字列は今後どうなるのか？

今後、端的には User-Agent 文字列から情報が削減され、最終的に凍結される見込みです。

そうすべき [モチベーション](https://github.com/WICG/ua-client-hints) として

> This header's value has grown in both length and complexity over the years; a complicated dance between server-side sniffing to provide the right experience for the right devices on the one hand, and client-side spoofing in order to bypass incorrect or inconvenient sniffing on the other.

長く、そして複雑怪奇な文字列仕様の解消と

> There's a lot of entropy wrapped up in the UA string that is sent to servers by default, for all first- and third-party requests.

それゆえの高いエントロピーがユーザー追跡を可能にしてしまう問題の排除、ということが述べられてます。

Google から [案内されている情報](https://www.chromium.org/updates/ua-reduction/) によればこのようなスケジュールで削除～凍結が進みます。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i04.png' />

## その時我々は何に困るのか？

> In Phase 4 we change the <minorVersion> token to "0.0.0".

や

> In Phase 5 we change the <platform> and <oscpu> tokens from their platform-defined values to the relevant <unifiedPlatform> token value (which will never change).

については、広告の例では不正判定やブラックリスト制御やホワイトリスト制御への影響があるかもしれませんが、肌感覚としてはそこまで大きな影響はなさそうです。

一方でそれなりの影響がありそうなのは年明けの

> In Phase 6, we change the <deviceModel> token to "K" and change the <androidVersion> token to a static "10" string.

です。何故なら

- ***deviceModel*** はデモグラに対する説明力が高い<br / >（例えば Disney Mobile は女性である可能性が高そう、など）
- 上述したように ***deviceModel*** からキャリア判定を行うケースがある
- Mobile の ***androidVersion*** は Desktop の ***unifiedPlatform*** よりもブラックリスト制御やホワイトリスト制御に使われるケースが多い

に対して影響が生じるためです。みなさまの Web アプリケーションへの影響はいかがでしょうか？

蛇足ですが Chrome 以外のブラウザについては 2022/09/08 現在では以下のような状況です。

| ブラウザ  | User-Agent 文字列の状況                                       |
| ---       | ---                                                           |
| Edge      | "Edg/" に続く ***minorVersion*** が残存（"0.0.0" ではない）   |
| Safari    | ***unifiedPlatform*** が既に固定されている                    |
| Firefox   | ***unifiedPlatform*** が既に固定されている                    |

## User Agent Client Hints（UA-CH）とは何か

では我々はどのように影響を回避もしくは最小化すべきでしょうか？

… 最初に結論から述べると「[User Agent Client Hints（以降 UA-CH）](https://github.com/WICG/ua-client-hints)」を活用する、

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

https://web.dev/migrate-to-ua-ch/

When processing this on the server-side you should first check if the desired Sec-CH-UA header has been sent and then fallback to the User-Agent header parsing if it is not available.

Cookie も含めたフォールバック

#### 入手できるサービス

ページ、サブリソース

#### 将来のリスク

