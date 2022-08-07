# DoH のちょっと気になる Web Browser 実装を確認

こんにちは、広告エンジニアの中山です。

広告と聞いて 3rd-party Cookie をイメージされる方も大勢いらっしゃるかと思います。我々も足元では [3rd-party Cookie EOL のニュース](https://blog.google/products/chrome/update-testing-privacy-sandbox-web/) に一喜一憂しつつ、中長期の視点ではプライバシー保護と広告エコシステム発展を両立させるための研究開発に取り組んでいます。

例えば 3rd-party Cookie を中心とした技術基盤の置き換えを推進する Privacy Sandbox への [コントリビュート](https://blog.chromium.org/2021/01/privacy-sandbox-in-2021.html) にも積極的で、オリジントライアルを通じたフィードバックなどを行ってます。

今日は Privacy Sandbox の範疇からは外れますが、プライバシー保護の文脈で DNS over HTTPS（以降 DoH）の Web Browser 実装、とりわけ Cookie 関連の実装について記事にしてみたいと思います。

| 名前解決手段      | トランスポート層  |
| ---               | ---               |
| DNS               | udp/53, tcp/53    |
| DoT               | tcp/853           |
| DoQ               | udp/8853          |
| DoH（今日の題材） | tcp/443           |
| DoH3              | udp/443           |

## DoH とは

DoH を有効にするにはお手持ちの Web Browser の設定画面（以下は Firefox の例）をご確認ください。

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/DoH/setting.png' />

従前の DNS を用いた名前解決ではプレーンテキストが送受信されますが、DoH を利用することで Web Browser と DNS キャッシュサーバ間の通信を「盗聴」「改竄」「なりすまし」から守ることができます。

[Mozilla によれば](https://wiki.mozilla.org/Trusted_Recursive_Resolver)

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

DoH を使うことでプライバシーおよびセキュリティーの向上が望めるとのことです。

## RFC 8484 とプライバシー

その一方で [RFC 8484](https://tools.ietf.org/html/rfc8484) には …

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP メカニズムを活用するのはよいとしてプラバシーに配慮しましょう、という記載や

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

特にプライバシー文脈において Web Browser は基本的には Cookie の受け入れに慎重になるべき、などの記載があります。さらに代表的な DoH サービスのレスポンスには Set-Cookie は含まれていないようです。

例えば dns.google → Web Browser の場合（以降の application/dns-message のエンティティーボディーは整形済です）は …

```
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
Date: Sun, 31 Jul 2022 03:20:10 GMT
Expires: Sun, 31 Jul 2022 03:20:10 GMT
Cache-Control: private, max-age=2359
Content-Type: application/dns-message
Server: HTTP server (unknown)
Content-Length: 60
X-XSS-Protection: 0
X-Frame-Options: SAMEORIGIN
Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-Q050=":443";
    ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"

0x1c 0x05 0x81 0x80 0x00 0x01 0x00 0x01 | .......
0x00 0x00 0x00 0x00 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x01 0x00 0x01 | .com....
0xc0 0x0c 0x00 0x01 0x00 0x01 0x00 0x00 | ........
0x00 0x43 0x00 0x04 0x8e 0xfb 0x2a 0x84 | ..C....*
```

cloudflare-dns.com → Web Browser の場合は …

```
HTTP/1.1 200 OK
Server: cloudflare
Date: Sun, 31 Jul 2022 09:02:35 GMT
Content-Type: application/dns-message
Connection: keep-alive
Access-Control-Allow-Origin: *
Content-Length: 48
CF-RAY: 733527ee7f88af24-NRT

0x99 0xeb 0x81 0x80 0x00 0x01 0x00 0x01 | .......
0x00 0x00 0x00 0x00 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x01 0x00 0x01 | .com....
0xc0 0x0c 0x00 0x01 0x00 0x01 0x00 0x00 | ........
0x00 0xec 0x00 0x04 0xac 0xd9 0xa1 0x24 | ........
```

doh.opendns.com → Web Browser の場合は …

```
HTTP/1.1 200 Success
Date: Sun, 31 July 2022 03:26:02 GMT
Content-Type: application/dns-message
Content-Length: 60

0xfb 0xa5 0x81 0x80 0x00 0x01 0x00 0x01 | .......
0x00 0x00 0x00 0x00 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x01 0x00 0x01 | .com....
0xc0 0x0c 0x00 0x01 0x00 0x01 0x00 0x00 | ........
0x01 0x2c 0x00 0x04 0x8e 0xfb 0x2a 0x84 | ..,....*
```

でした。とはいえ、もし魔が差した DoH サービスが Cookie を使ってユーザー識別子と名前解決要求を紐づけ、興味関心情報として蓄積し第三者に提供することを目論んだ場合、Mozilla の主張するプライバシーの向上どころか重大な脅威になり得ます。

## DoH x Cookie のテストシナリオ

では、実際にそのようなことが可能なのか Web Browser の動作を検証してみましょう。

以下は DoH リクエストを Google の DNS（8.8.8.8）に転送し、その結果を DoH レスポンスとする簡易 DoH サーバの実装です。

```php
<?php

set_time_limit(1);

define('DNSADDR', '8.8.8.8');
define('IOSLEEP', 0.01);

function getDnsResponse($in_request)
{
    $handle = fsockopen('udp://' . DNSADDR, 53);
    if (!$handle) {
        return NULL;
    }
    stream_set_blocking($handle, FALSE);
    fwrite($handle, $in_request);
    $response = '';
    while (!feof($handle)) {
        $read = fread($handle, 8192);
        if (strlen($read) > 0) {
            $response .= $read;
            continue;
        }
        if (strlen($response) > 0) {
            // can't read any more
            break;
        } else {
            usleep(IOSLEEP * 1000000);
        }
    }
    fclose($handle);
    return $response;
}

$request = file_get_contents('php://input');
$response = getDnsResponse($request);
$headers = array(
    'Content-Type: application/dns-message',
    'Content-Length: ' . strlen($response),
    // Set-Cookie Header with DoH Response
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
);
foreach ($headers as $header) {
    header($header);
}
print $response;

?>
```

以下のコードで DoH レスポンスと一緒に Set-Cookie Header をレスポンスしています。

```php
    // Set-Cookie Header with DoH Response
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
```

この簡易 DoH サーバを使って次のリナリオをテストしてみます。

1. DoH レスポンスで Set-Cookie を受けた Web Browser は …
	- 1-1. DoH リクエストでその Cookie を送信するか？
	- 1-2. 通常の Web ブラウジング（HTTP リクエスト）でその Cookie を送信するか？
2. 通常の Web ブラウジング（HTTP レスポンスで）Set-Cookie を受けた Web Browser は …
	- 2-1. DoH リクエストでその Cookie を送信するか？
	- ~~2-2. 通常の Web ブラウジング（HTTP リクエスト）でその Cookie を送信するか？~~<br/>→ 自明（= Cookie を送信する）なので割愛

テストに利用した Web Browser のバージョンは以下の通りです。

- Firefox 103.0
- Chrome 103.0.5060.134
- Microsoft Edge 103.0.1264.71

さて、どのような結果となるでしょうか。

## DoH x Cookie のテスト結果

結論から述べると、全てのリナリオ x Web Browser で Cookie が送信されることはありませんでした。

| <br/>***Set-Cookie***<br/>***Cookie*** | （1-1）<br/>***by DoH***<br/>***to DoH*** | （1-2）<br/>***by DoH***<br/>***to Web*** | （2-1）<br/>***by Web***<br/>***to DoH*** | （2-2）<br/>***by Web***<br/>***to Web*** |
| ---               | ---           | ---           | ---           | ---       |
| Firefox           | 送信しない    | 送信しない    | 送信しない    | 送信する  |
| Chrome            | 送信しない    | 送信しない    | 送信しない    | 送信する  |
| Microsoft Edge    | 送信しない    | 送信しない    | 送信しない    | 送信する  |

### Firefox の通信キャプチャ

シナリオ 1-1 の通信を確認します。

まずは最初の Web Browser → DoH リクエストです。

```
Host: TEST_SERVER
Accept: application/dns-message
Accept-Encoding: 
Content-Type: application/dns-message
Content-Length: 128
Cache-Control: no-store, no-cache
Connection: keep-alive
Pragma: no-cache

0x00 0x00 0x01 0x00 0x00 0x01 0x00 0x00 | .......
0x00 0x00 0x00 0x01 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x1c 0x00 0x01 | .com....
0x00 0x00 0x29 0x10 0x00 0x00 0x00 0x00 | ...)....
0x00 0x00 0x55 0x00 0x08 0x00 0x04 0x00 | ...U....
0x01 0x00 0x00 0x00 0x0c 0x00 0x49 0x00 | .......I
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
```

それに対する Set-Cookie を含めた DoH レスポンス → Web Browser です。

```
Content-Length: 79
Cache-Control: max-age=0
Connection: Close
Set-Cookie: dohcookie=81; Secure; HttpOnly

0x00 0x00 0x81 0x80 0x00 0x01 0x00 0x01 | .......
0x00 0x00 0x00 0x01 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x1c 0x00 0x01 | .com....
0xc0 0x0c 0x00 0x1c 0x00 0x01 0x00 0x00 | ........
0x00 0x05 0x00 0x10 0x24 0x04 0x68 0x00 | .....$.h
0x40 0x04 0x08 0x0b 0x00 0x00 0x00 0x00 | .@......
0x00 0x00 0x20 0x04 0x00 0x00 0x29 0x02 | ... ...)
0x00 0x00 0x00 0x00 0x00 0x00 0x08 0x00 | ........
0x08 0x00 0x04 0x00 0x01 0x00 0x00 
```

二回目以降の Web Browser → DoH リクエストで Cookie は送信されませんでした。

```
Host: TEST_SERVER
Accept: application/dns-message
Accept-Encoding: 
Content-Type: application/dns-message
Content-Length: 128
Cache-Control: no-store, no-cache
Connection: keep-alive
Pragma: no-cache

0x00 0x00 0x01 0x00 0x00 0x01 0x00 0x00 | .......
0x00 0x00 0x00 0x01 0x04 0x6f 0x63 0x73 | ......oc
0x70 0x03 0x70 0x6b 0x69 0x04 0x67 0x6f | sp.pki.g
0x6f 0x67 0x00 0x00 0x1c 0x00 0x01 0x00 | oog.....
0x00 0x29 0x10 0x00 0x00 0x00 0x00 0x00 | ..).....
0x00 0x56 0x00 0x08 0x00 0x04 0x00 0x01 | ..V.....
0x00 0x00 0x00 0x0c 0x00 0x4a 0x00 0x00 | ......J.
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
```

次にこの状態からシナリオ 1-2 を確認します。

DoH と同じドメインの Web ページに対する Web Browser → HTTP リクエストでも Cookie は送信されませんでした。

```
GET /PATH_TO_SCRIPT/SCRIPT HTTP/1.1
Host: TEST_SERVER
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: ja,en-US;q=0.7,en;q=0.3
Accept-Encoding: gzip, deflate, br
DNT: 1
Connection: keep-alive
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
Sec-Fetch-User: ?1
```

最後にシナリオ 2-1 の通信を確認します。

まず DoH と同じドメインの Web ページに対する Set-Cookie を含めた HTTP レスポンス → Web Browser です。

```
HTTP/1.1 200 OK
Date: Sat, 30 Jul 2022 23:51:20 GMT
Set-Cookie: webcookie=77; Secure; HttpOnly
Content-Length: 1385
Keep-Alive: timeout=5, max=100
Connection: Keep-Alive
Content-Type: text/plane;charset=UTF-8

/* entity body (omitted) */

```

二回目以降の Web ページに対する Web Browser → HTTP リクエストで Cookie が送信されていることが確認できます。


```
GET /PATH_TO_SCRIPT/SCRIPT HTTP/1.1
Host: TEST_SERVER
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: ja,en-US;q=0.7,en;q=0.3
Accept-Encoding: gzip, deflate, br
DNT: 1
Connection: keep-alive
Cookie: webcookie=77
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
```

しかしながら Web Browser → DoH リクエストでは Cookie は送信されませんでした。

```
Host: TEST_SERVER
Accept: application/dns-message
Accept-Encoding: 
Content-Type: application/dns-message
Content-Length: 128
Cache-Control: no-store, no-cache
Connection: keep-alive
Pragma: no-cache

0x00 0x00 0x01 0x00 0x00 0x01 0x00 0x00 | .......
0x00 0x00 0x00 0x01 0x03 0x77 0x77 0x77 | ......ww
0x06 0x67 0x6f 0x6f 0x67 0x6c 0x65 0x03 | w.google
0x63 0x6f 0x6d 0x00 0x00 0x1c 0x00 0x01 | .com....
0x00 0x00 0x29 0x10 0x00 0x00 0x00 0x00 | ...)....
0x00 0x00 0x55 0x00 0x08 0x00 0x04 0x00 | ...U....
0x01 0x00 0x00 0x00 0x0c 0x00 0x49 0x00 | .......I
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 | ........
```

補足しますと、全てのシナリオにおける Web Browser → DoH リクエストでは Cookie のみならず User-Agent や Accept-Language などのユーザー識別に寄与する情報も送信されていないことを確認できました（[参考](https://bugzilla.mozilla.org/show_bug.cgi?id=1543201)）。さらに Mozilla は DoH サービスに対して IP の収集を [禁止するポリシー](https://wiki.mozilla.org/Security/DOH-resolver-policy) も策定しています。このことから Cookie のみならず Finger Printing 観点でも追跡行為に対して十分な配慮がなされている、と言えそうです。

あと Firefox の DoH リクエストで Accept-Encoding が空の値なのは … 気にしないことにします ^^;

## まとめ

今回利用した Web Browser の実装ではシナリオ 1-1, 1-2, 2-1 ともに Cookie は送信されず、ゆえに DoH サービスがユーザーを識別して興味関心情報を蓄積することは困難である、ということが確認できました。ですので、Web Browser と DNS キャッシュサーバ間の通信を「盗聴」「改竄」「なりすまし」から守りたい方は DoH の活用をご検討ください。

蛇足ですが Web アプリケーションの開発 ～ テストの際には hosts を変更することがありますが、設定ミスや元に戻すことを忘れた結果のトラブルをしばしば見かけます。同じ環境で開発 ～ テストをしているグループ向けの設定を社内の DoH サービスで提供し、テスト実施者は Web Browser の DoH を on/off することで利用する環境を切り替える、もしくはテスト専用の Web Browser でのみ DoH を使う、的な運用で hosts 変更によるトラブルが減らせるかも … などと感じた今日この頃です。そのような用途向けに [簡易 DoH サーバ + application/dns-message 解析 & 構築のサンプルコード](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) を置きましたのでよろしければご活用ください。

```
// packed application/dns-message

0x29 0xbf 0x01 0x80 0x00 0x01 0x00 0x00 | )......
0x00 0x00 0x00 0x00 0x03 0x77 0x77 0x77 | ......ww
0x05 0x79 0x61 0x68 0x6f 0x6f 0x02 0x63 | w.yahoo.
0x6f 0x02 0x6a 0x70 0x00 0x00 0x01 0x00 | co.jp...
0x01 

// unpacked array

Array (
    [HEADER] => Array (
        [ID] => 10687,
        [F_QR] => 0,
        [F_OPCODE] => 0,
        [F_AA] => 0,
        [F_TC] => 0,
        [F_RD] => 1,
        [F_RA] => 1,
        [F_Z] => 0,
        [F_AD] => 0,
        [F_CD] => 0,
        [F_RCODE] => 0,
        [QDCOUNT] => 1,
        [ANCOUNT] => 0,
        [NSCOUNT] => 0,
        [ARCOUNT] => 0
    ),
    [QDSECTIONS] => Array (
        [0] => Array (
            [DOMAIN] => Array (
                [0] => www,
                [1] => yahoo,
                [2] => co,
                [3] => jp
            ),
            [TYPE] => 1,
            [CLASS] => 1
        )
    ),
    [ANSECTIONS] => Array (),
    [NSSECTIONS] => Array (),
    [ARSECTIONS] => Array ()
)
```

あ、言い忘れましたが、ヤフー広告ではプライバシー保護と広告エコシステム発展を両立を志す仲間を募集中です！我こそはという方のご連絡をお待ちしております。
