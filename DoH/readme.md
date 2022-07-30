# DoH の気になる Web Browser 実装を確認してみる

こんにちは、広告エンジニアの中山です。

夢は大きくプライバシー保護と広告エコシステム発展の両立を掲げつつ、足元では 3rd-party Cookie EOL のニュースに一喜一憂する日々を過ごしております。

今日は DNS over HTTPS（以下 DoH）の気になる … とりわけプライバシー観点における Web Browser 実装について記事にしてみたいと思います。

ところで、皆さんは既に DoH を試されたでしょうか？

[Mozilla によれば](https://wiki.mozilla.org/Trusted_Recursive_Resolver)

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

だそうで DoH を利用することで User-Agent と DNS キャッシュサーバ間の通信を「盗聴」「改竄」「なりすまし」から守り、プライバシーとセキュリティーの改善が望めます。

その一方で [RFC 8484](https://tools.ietf.org/html/rfc8484) には …

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP メカニズムを活用するのはよいが、プラバシーに気を付けましょう、という記載や

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

とりわけプライバシー文脈において Web Browser は基本的には Cookie の受け入れに慎重になるべき、といった記載が見つかります。

Cloudflare の [Example](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/) にも Set-Cookie を含んだ DoH レスポンスの例が見つかりますが、この扱いによってどのようなプライバシー上の脅威が生じるのでしょうか？

例えば悪意ある DoH サービスがユーザーアカウントと名前解決要求を紐づけ、興味関心情報として蓄積して第三者提供する等のユースケースが考えられます。

もし閲覧履歴（に近しい情報）が自分の知らない間に第三者にわたってしまうとすればプライバシー上の脅威になることは間違いありません。

## DoH x Cookie のテストシナリオ

では、実際にそのようなことが可能なのか否かを調査してみます。

以下は DoH リクエストを Google の DNS（8.8.8.8）に転送し、その結果を DoH レスポンスとする簡易 DoH サーバの実装です。

```php
<?php

set_time_limit(3);

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
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
);
foreach ($headers as $header) {
    header($header);
}
print $response;

?>
```
以下のコードで DoH レスポンスと一緒に Set-Cookie もレスポンスしています。

```php
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
```

この簡易 DoH サーバを使って次のリナリオをテストしてみます。

1. DoH レスポンスで Set-Cookie を受けた Web Browser は …
	1-1. DoH リクエストでその Cookie を送信するか
	1-2. 通常の Web ブラウジング（HTTP リクエスト）でその Cookie を送信するか
2. 通常の Web ブラウジング（HTTP レスポンスで）Set-Cookie を受けた Web Browser は …
	2-1. DoH リクエストでその Cookie を送信するか

テストに利用する Web Browser のバージョンは以下の通りです。

- Chrome 103.0.5060.134
- Firefox 103.0
- Microsoft Edge 103.0.1264.71

さて、どのような結果となるでしょうか。

## DoH x Cookie のテスト結果

（表とログ）

## まとめ

今回利用した Web Browser の実装ではシナリオ 1-1, 1-2, 2-1 ともに Cookie は送信されず、ゆえに DoH サービスに悪意があっても、ユーザーを識別した上での興味関心情報を蓄積することは困難である、ということが確認できました。ですので、プライバシーとセキュリティーの改善を望む方は DoH の活用をご検討ください！

余談ですが Web アプリケーションの開発 ～ テストの際にはしばしば hosts を変更することがありますが、設定ミスや元に戻すことを忘れた結果のトラブルをしばしば見かけます。同じ環境で開発 ～ テストをしているグループ向けの設定を社内の DoH サービスで提供し、テスト実施者は Web Browser の DoH を on/off することで利用する環境を切り替える、もしくはテスト専用の Web Browser でのみ DoH を使う ... なんて運用で hosts 変更によるトラブルが減らせやしないだろうか？と感じた今日この頃です。

そんな用途向けに [簡易 DoH サーバ + DNS メッセージ解析 & 構築のサンプルコード](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) を置きましたのでよろしければご活用ください。

