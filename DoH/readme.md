# DoH の気になる Web Browser 実装を確認してみる

こんにちは、広告エンジニアの中山です。

夢は大きくプライバシー保護と広告エコシステム発展の両立を掲げつつ、足元では 3rd-party Cookie EOL のニュースに一喜一憂する日々を過ごしております。

今日は DNS over HTTPS（以下 DoH）の気になる … とりわけプライバシー観点における … Web Browser 実装について記事にしてみたいと思います。

ところで、皆さんは既に DoH を利用されているでしょうか？

[Mozilla によれば](https://wiki.mozilla.org/Trusted_Recursive_Resolver)

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

だそうで DoH を利用することで Web Browser と DNS キャッシュサーバ間の通信を「盗聴」「改竄」「なりすまし」から守り、プライバシーおよびセキュリティーの向上が望めます。

その一方で [RFC 8484](https://tools.ietf.org/html/rfc8484) には …

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP メカニズムを活用するのはよいがプラバシーに配慮しましょう、という記載や

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

特にプライバシー文脈において Web Browser は基本的には Cookie の受け入れに慎重になるべき、といった記載が見つかります。

Cloudflare の [Example](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/) にも Set-Cookie を含んだ DoH レスポンスの例が見つかりますが、この扱いによってどのようなプライバシー上の脅威が生じるのでしょうか？

例えば悪意ある DoH サービスがユーザー識別子と名前解決要求を紐づけ、興味関心情報として蓄積して第三者提供する等のユースケースが考えられます。もし閲覧履歴（に近しい情報）が自分の知らない間に第三者にわたってしまうとすればプライバシー上の脅威になることは間違いありません。

## DoH x Cookie のテストシナリオ

では、実際にそのようなことが可能なのか検証してみましょう。

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
    'Cache-Control: max-age=0',
    'Connection: Close',
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

テストに利用した Web Browser のバージョンは以下の通りです。

- Firefox 103.0
- Chrome 103.0.5060.134
- Microsoft Edge 103.0.1264.71

さて、どのような結果となるでしょうか。

## DoH x Cookie のテスト結果

結論から述べると、全てのリナリオ x Web Browser で Cookie が送信されることはありませんでした。

| Web Browser       | 1-1           | 1-2           | 2-1           |
| ---               | ---           | ---           | ---           |
| Firefox           | 送信しない    | 送信しない    | 送信しない    |
| Chrome            | 送信しない    | 送信しない    | 送信しない    |
| Microsoft Edge    | 送信しない    | 送信しない    | 送信しない    |

### Firefox の通信キャプチャ

シナリオ 1-1 の通信を確認します。まずは最初の DoH リクエストです。

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

それに対して Set-Cookie を含めた DoH レスポンスです。

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

二回目以降の DoH リクエストで Cookie は送信されませんでした。

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

次にこの状態からシナリオ 1-2 を確認します。DoH と同じドメインの Web ページに対する HTTP リクエストで Cookie は送信されませんでした。

```
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

/* entity body */
```

最後にシナリオ 2-1 の通信を確認します。Web Browser は DoH と同じドメインの Web ページに対する Set-Cookie を含めた HTTP レスポンスを受け取ります。

```
HTTP/1.1 200 OK
Date: Sat, 30 Jul 2022 23:51:20 GMT
Set-Cookie: webcookie=77; Secure; HttpOnly
Content-Length: 1385
Keep-Alive: timeout=5, max=100
Connection: Keep-Alive
Content-Type: text/plane;charset=UTF-8

/* entity body */
```

二回目以降の Web ページに対するリクエストで Cookie が送信されていることが確認できます。


```
GET /PATH_TO_SCRIPT/doh.php HTTP/1.1
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

/* entity body */
```

しかしながら DoH リクエストで Cookie は送信されませんでした。

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

## まとめ

今回利用した Web Browser の実装ではシナリオ 1-1, 1-2, 2-1 ともに Cookie は送信されず、ゆえに DoH サービスがユーザーを識別して興味関心情報を蓄積することは困難である、ということが確認できました。ですので、プライバシーとセキュリティーの向上を望む方は DoH の活用をご検討ください！

余談ですが Web アプリケーションの開発 ～ テストの際には hosts を変更することがありますが、設定ミスや元に戻すことを忘れた結果のトラブルをしばしば見かけます。同じ環境で開発 ～ テストをしているグループ向けの設定を社内の DoH サービスで提供し、テスト実施者は Web Browser の DoH を on/off することで利用する環境を切り替える、もしくはテスト専用の Web Browser でのみ DoH を使う ... なんて運用で hosts 変更によるトラブルが減らせるかもしれない？と感じた今日この頃です。

そのような用途向けに [簡易 DoH サーバ + DNS メッセージ解析 & 構築のサンプルコード](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) を置きましたのでよろしければご活用ください。

