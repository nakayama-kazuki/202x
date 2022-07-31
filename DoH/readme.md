# DoH �̋C�ɂȂ� Web Browser �������m�F���Ă݂�

����ɂ��́A�L���G���W�j�A�̒��R�ł��B

���͑傫���v���C�o�V�[�ی�ƍL���G�R�V�X�e�����W�̗������f���A�����ł� 3rd-party Cookie EOL �̃j���[�X�Ɉ���J������X���߂����Ă���܂��B

������ DNS over HTTPS�i�ȉ� DoH�j�̋C�ɂȂ� �c �Ƃ�킯�v���C�o�V�[�ϓ_�ɂ����� �c Web Browser �����ɂ��ċL���ɂ��Ă݂����Ǝv���܂��B

�Ƃ���ŁA�F����͊��� DoH �𗘗p����Ă���ł��傤���H

[Mozilla �ɂ���](https://wiki.mozilla.org/Trusted_Recursive_Resolver)

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

�������� DoH �𗘗p���邱�Ƃ� Web Browser �� DNS �L���b�V���T�[�o�Ԃ̒ʐM���u�����v�u��₁v�u�Ȃ肷�܂��v������A�v���C�o�V�[����уZ�L�����e�B�[�̌��オ�]�߂܂��B

���̈���� [RFC 8484](https://tools.ietf.org/html/rfc8484) �ɂ� �c

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP ���J�j�Y�������p����̂͂悢���v���o�V�[�ɔz�����܂��傤�A�Ƃ����L�ڂ�

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

���Ƀv���C�o�V�[�����ɂ����� Web Browser �͊�{�I�ɂ� Cookie �̎󂯓���ɐT�d�ɂȂ�ׂ��A�Ƃ������L�ڂ�������܂��B

Cloudflare �� [Example](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/) �ɂ� Set-Cookie ���܂� DoH ���X�|���X�̗Ⴊ������܂����A���̈����ɂ���Ăǂ̂悤�ȃv���C�o�V�[��̋��Ђ�������̂ł��傤���H

�Ⴆ�Έ��ӂ��� DoH �T�[�r�X�����[�U�[���ʎq�Ɩ��O�����v����R�Â��A�����֐S���Ƃ��Ē~�ς��đ�O�Ғ񋟂��铙�̃��[�X�P�[�X���l�����܂��B�����{�������i�ɋ߂������j�������̒m��Ȃ��Ԃɑ�O�҂ɂ킽���Ă��܂��Ƃ���΃v���C�o�V�[��̋��ЂɂȂ邱�Ƃ͊ԈႢ����܂���B

## DoH x Cookie �̃e�X�g�V�i���I

�ł́A���ۂɂ��̂悤�Ȃ��Ƃ��\�Ȃ̂����؂��Ă݂܂��傤�B

�ȉ��� DoH ���N�G�X�g�� Google �� DNS�i8.8.8.8�j�ɓ]�����A���̌��ʂ� DoH ���X�|���X�Ƃ���Ȉ� DoH �T�[�o�̎����ł��B

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

�ȉ��̃R�[�h�� DoH ���X�|���X�ƈꏏ�� Set-Cookie Header �����X�|���X���Ă��܂��B

```php
    // Set-Cookie Header with DoH Response
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
```

���̊Ȉ� DoH �T�[�o���g���Ď��̃��i���I���e�X�g���Ă݂܂��B

1. DoH ���X�|���X�� Set-Cookie ���󂯂� Web Browser �� �c
	- 1-1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩�H
	- 1-2. �ʏ�� Web �u���E�W���O�iHTTP ���N�G�X�g�j�ł��� Cookie �𑗐M���邩�H
2. �ʏ�� Web �u���E�W���O�iHTTP ���X�|���X�ŁjSet-Cookie ���󂯂� Web Browser �� �c
	- 2-1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩�H

�e�X�g�ɗ��p���� Web Browser �̃o�[�W�����͈ȉ��̒ʂ�ł��B

- Firefox 103.0
- Chrome 103.0.5060.134
- Microsoft Edge 103.0.1264.71

���āA�ǂ̂悤�Ȍ��ʂƂȂ�ł��傤���B

## DoH x Cookie �̃e�X�g����

���_����q�ׂ�ƁA�S�Ẵ��i���I x Web Browser �� Cookie �����M����邱�Ƃ͂���܂���ł����B

| Web Browser       | 1-1           | 1-2           | 2-1           |
| ---               | ---           | ---           | ---           |
| Firefox           | ���M���Ȃ�    | ���M���Ȃ�    | ���M���Ȃ�    |
| Chrome            | ���M���Ȃ�    | ���M���Ȃ�    | ���M���Ȃ�    |
| Microsoft Edge    | ���M���Ȃ�    | ���M���Ȃ�    | ���M���Ȃ�    |

### Firefox �̒ʐM�L���v�`��

�V�i���I 1-1 �̒ʐM���m�F���܂��B�܂��͍ŏ��� DoH ���N�G�X�g�ł��B

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

����ɑ΂��� Set-Cookie ���܂߂� DoH ���X�|���X�ł��B

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

���ڈȍ~�� DoH ���N�G�X�g�� Cookie �͑��M����܂���ł����B

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

���ɂ��̏�Ԃ���V�i���I 1-2 ���m�F���܂��BDoH �Ɠ����h���C���� Web �y�[�W�ɑ΂��� HTTP ���N�G�X�g�� Cookie �͑��M����܂���ł����B

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

�Ō�ɃV�i���I 2-1 �̒ʐM���m�F���܂��BWeb Browser �� DoH �Ɠ����h���C���� Web �y�[�W�ɑ΂��� Set-Cookie ���܂߂� HTTP ���X�|���X���󂯎��܂��B

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

���ڈȍ~�� Web �y�[�W�ɑ΂��郊�N�G�X�g�� Cookie �����M����Ă��邱�Ƃ��m�F�ł��܂��B


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

�������Ȃ��� DoH ���N�G�X�g�� Cookie �͑��M����܂���ł����B

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

## �܂Ƃ�

���񗘗p���� Web Browser �̎����ł̓V�i���I 1-1, 1-2, 2-1 �Ƃ��� Cookie �͑��M���ꂸ�A�䂦�� DoH �T�[�r�X�����[�U�[�����ʂ��ċ����֐S����~�ς��邱�Ƃ͍���ł���A�Ƃ������Ƃ��m�F�ł��܂����B�ł��̂ŁA�v���C�o�V�[�ƃZ�L�����e�B�[�̌����]�ޕ��� DoH �̊��p�����������������I

�]�k�ł��� Web �A�v���P�[�V�����̊J�� �` �e�X�g�̍ۂɂ� hosts ��ύX���邱�Ƃ�����܂����A�ݒ�~�X�⌳�ɖ߂����Ƃ�Y�ꂽ���ʂ̃g���u�������΂��Ό������܂��B�������ŊJ�� �` �e�X�g�����Ă���O���[�v�����̐ݒ���Г��� DoH �T�[�r�X�Œ񋟂��A�e�X�g���{�҂� Web Browser �� DoH �� on/off ���邱�Ƃŗ��p�������؂�ւ���A�������̓e�X�g��p�� Web Browser �ł̂� DoH ���g�� ... �Ȃ�ĉ^�p�� hosts �ύX�ɂ��g���u�������点�邩������Ȃ��H�Ɗ������������̍��ł��B

���̂悤�ȗp�r������ [�Ȉ� DoH �T�[�o + DNS ���b�Z�[�W��� & �\�z�̃T���v���R�[�h](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) ��u���܂����̂ł�낵����΂����p���������B

