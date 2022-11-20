# 今は、もう、動かない大きなのっぽの User-Agent 文字列

こんにちは、広告エンジニアの中山です。

みなさまの Web アプリケーションには User-Agent 文字列を参照する処理はありますか？

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

一方でそれなりの影響がありそうなのは 2023 年が明けてからの

> In Phase 6, we change the <deviceModel> token to "K" and change the <androidVersion> token to a static "10" string.

のタイミングです。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i05.png' />

ここで ***androidVersion*** が "10" に、そして ***deviceModel*** が "K" に固定されてしまいます。そうなると …

- ***deviceModel*** がデモグラに対する説明力を失う<br />（例えば Disney Mobile on docomo のユーザーは女性である可能性が高そう … などの推定ができなくなる）
- ***deviceModel*** からキャリア判定ができなくなる
- Mobile の ***androidVersion*** をブラックリスト制御やホワイトリスト制御に使えなくなる<br />（Desktop の ***unifiedPlatform*** と比べ Mobile における特定のバグ回避ニーズは高いと思われます）

のような用途に対して影響が生じます。みなさまの Web アプリケーションへの影響はいかがでしょうか？

蛇足ですが Chrome 以外のブラウザについては 2022/09/08 現在では以下のような状況です。

| ブラウザ  | User-Agent 文字列の状況                                       |
| ---       | ---                                                           |
| Edge      | "Edg/" に続く ***minorVersion*** が残存（"0.0.0" ではない）   |
| Safari    | ***unifiedPlatform*** が既に固定されている                    |
| Firefox   | ***unifiedPlatform*** が既に固定されている                    |

## User Agent Client Hints（UA-CH）による対策案

我々はこの影響を受け入れるしかないのでしょうか。

ブラウザはサーバに対して以下のような「[User Agent Client Hints（以降 UA-CH）](https://github.com/WICG/ua-client-hints)」をリクエストヘッダとして送信しておりますが、結論としてはこの UA-CH を活用することで影響を最小化することができます。

```
sec-ch-ua: "Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
```

ただし、この UA-CH はそのままでは User-Agent 文字列の ***deviceModel*** などに相当する情報を得ることができないため、

- サーバが追加情報の送信を要求する Accept-CH をレスポンスヘッダとして送信する
- ブラウザ側で UA-CH JS API を用いて追加情報を取得する

などの手段が必要になります。そのことについてまとめたのがこちらの表です。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i06.png' />

では、それぞれの選択肢について考察してみましょう。

#### 1. UA-CH JS API

既存の Web アプリケーションが DOM の Navigator オブジェクトから情報を取得している場合には移行しやすい方法です。一方で、将来 [Privacy Budget（取得可能なデータ量に制限を設ける仕様）](https://developer.chrome.com/docs/privacy-sandbox/privacy-budget/) が導入されたタイミングで影響が生じやすいと思われるため、その際の対応を想定しておく必要がありそうです。

```
navigator.userAgentData.getHighEntropyValues(['model']).then(ua => {
    const model = ua.model
});
```

#### 2. UA-CH JS API x Cache

取得した追加情報を localStorage や Cookie に Cache することで Privacy Budget の制限抵触リスクを低くすることができます。

#### 3. Accept-CH

既存の Web アプリケーションが HTTP の User-Agent 文字列から情報を取得している場合には移行しやすい方法です。課題は 1 同様に将来の Privacy Budget 対応が必要なことと、初回ページリクエストのタイミングに機会損失が発生することです。

```
Accept-CH: Sec-CH-UA-Model
```

#### 4. Accept-CH x Cache

取得した追加情報を Cookie に Cache し、フォールバックを UA-CH → Cache → User-Agent 文字列 … の順で処理することで機会損失を最小化し、Privacy Budget の制限抵触リスクを低くすることができます。フォールバック処理については [Migrate to User-Agent Client Hints](https://web.dev/migrate-to-ua-ch/) の記載も参考にしてください。このあたりは具合の良いライブラリの登場を期待します（他力本願 ^^;）。

> When processing this on the server-side you should first check if the desired Sec-CH-UA header has been sent and then fallback to the User-Agent header parsing if it is not available.

#### 5. Accept-CH x Critical-CH

Critical-CH を使うことで機会損失を 0 にできますが、この設定ではセッションをまたいだ初回アクセス時にリクエスト + レスポンスが 2 往復することになるため、アクセスの多い Web アプリケーションの場合は避けたい設定です。

#### 6. Accept-CH x Critical-CH x Cache

取得した追加情報を Cookie に Cache することで 5 の課題を概ね解消できます。が、プライベートブラウジングによるアクセスが多い場合には課題は解消されません。とはいえ、機会損失最小化の優先度が高い場合には現実解となりそうです。

## Accept-CH の有効範囲について

ここまでの考察から前述の 5 はデメリットを考慮して除外します。さらに Privacy Budget は導入時期や仕様が明確になってからの検討でも遅くはないので 2 も除外します。残りの選択肢については既存の Web アプリケーションが …

- DOM の Navigator オブジェクトから情報を取得しているならば 1 を選択
- HTTP の User-Agent 文字列から情報を取得しているならば、機会損失に対する受容度合とアプリケーションの複雑化のデメリットを勘案して 3, 4, 6 から選択

… とするのがよさそうです。

我々はここで 3 を選択することにしますが、改めて Accept-CH の有効範囲についても確認しておきましょう。サブリソースに対して追加の UA-CH 送信を求める場合には Permissions-Policy を用いることになってますが、それ以外で確認したいユースケースを表にまとめてみました。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/UA-CH/i07.png' />
