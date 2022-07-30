# DoH �̋C�ɂȂ� Web Browser �������m�F���Ă݂�

����ɂ��́A�L���G���W�j�A�̒��R�ł��B

���͑傫���v���C�o�V�[�ی�ƍL���G�R�V�X�e�����W�̗������f���A�����ł� 3rd-party Cookie EOL �̃j���[�X�Ɉ���J������X���߂����Ă���܂��B

������ DNS over HTTPS�i�ȉ� DoH�j�̋C�ɂȂ� �c �Ƃ�킯�v���C�o�V�[�ϓ_�ɂ����� Web Browser �����ɂ��ċL���ɂ��Ă݂����Ǝv���܂��B

�Ƃ���ŁA�F����͊��� DoH �������ꂽ�ł��傤���H

[Mozilla �ɂ���](https://wiki.mozilla.org/Trusted_Recursive_Resolver)

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

�������� DoH �𗘗p���邱�Ƃ� User-Agent �� DNS �L���b�V���T�[�o�Ԃ̒ʐM���u�����v�u��₁v�u�Ȃ肷�܂��v������A�v���C�o�V�[�ƃZ�L�����e�B�[�̉��P���]�߂܂��B

���̈���� [RFC 8484](https://tools.ietf.org/html/rfc8484) �ɂ� �c

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP ���J�j�Y�������p����̂͂悢���A�v���o�V�[�ɋC��t���܂��傤�A�Ƃ����L�ڂ�

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

�Ƃ�킯�v���C�o�V�[�����ɂ����� Web Browser �͊�{�I�ɂ� Cookie �̎󂯓���ɐT�d�ɂȂ�ׂ��A�Ƃ������L�ڂ�������܂��B

Cloudflare �� [Example](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/) �ɂ� Set-Cookie ���܂� DoH ���X�|���X�̗Ⴊ������܂����A���̈����ɂ���Ăǂ̂悤�ȃv���C�o�V�[��̋��Ђ�������̂ł��傤���H

�Ⴆ�Έ��ӂ��� DoH �T�[�r�X�����[�U�[�A�J�E���g�Ɩ��O�����v����R�Â��A�����֐S���Ƃ��Ē~�ς��đ�O�Ғ񋟂��铙�̃��[�X�P�[�X���l�����܂��B

�����{�������i�ɋ߂������j�������̒m��Ȃ��Ԃɑ�O�҂ɂ킽���Ă��܂��Ƃ���΃v���C�o�V�[��̋��ЂɂȂ邱�Ƃ͊ԈႢ����܂���B

## DoH x Cookie �̃e�X�g�V�i���I

�ł́A���ۂɂ��̂悤�Ȃ��Ƃ��\�Ȃ̂��ۂ��𒲍����Ă݂܂��B

�ȉ��� DoH ���N�G�X�g�� Google �� DNS�i8.8.8.8�j�ɓ]�����A���̌��ʂ� DoH ���X�|���X�Ƃ���Ȉ� DoH �T�[�o�̎����ł��B

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
�ȉ��̃R�[�h�� DoH ���X�|���X�ƈꏏ�� Set-Cookie �����X�|���X���Ă��܂��B

```php
    'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
```

���̊Ȉ� DoH �T�[�o���g���Ď��̃��i���I���e�X�g���Ă݂܂��B

1. DoH ���X�|���X�� Set-Cookie ���󂯂� Web Browser �� �c
	1-1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩
	1-2. �ʏ�� Web �u���E�W���O�iHTTP ���N�G�X�g�j�ł��� Cookie �𑗐M���邩
2. �ʏ�� Web �u���E�W���O�iHTTP ���X�|���X�ŁjSet-Cookie ���󂯂� Web Browser �� �c
	2-1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩

�e�X�g�ɗ��p���� Web Browser �̃o�[�W�����͈ȉ��̒ʂ�ł��B

- Chrome 103.0.5060.134
- Firefox 103.0
- Microsoft Edge 103.0.1264.71

���āA�ǂ̂悤�Ȍ��ʂƂȂ�ł��傤���B

## DoH x Cookie �̃e�X�g����

�i�\�ƃ��O�j

## �܂Ƃ�

���񗘗p���� Web Browser �̎����ł̓V�i���I 1-1, 1-2, 2-1 �Ƃ��� Cookie �͑��M���ꂸ�A�䂦�� DoH �T�[�r�X�Ɉ��ӂ������Ă��A���[�U�[�����ʂ�����ł̋����֐S����~�ς��邱�Ƃ͍���ł���A�Ƃ������Ƃ��m�F�ł��܂����B�ł��̂ŁA�v���C�o�V�[�ƃZ�L�����e�B�[�̉��P��]�ޕ��� DoH �̊��p�����������������I

�]�k�ł��� Web �A�v���P�[�V�����̊J�� �` �e�X�g�̍ۂɂ͂��΂��� hosts ��ύX���邱�Ƃ�����܂����A�ݒ�~�X�⌳�ɖ߂����Ƃ�Y�ꂽ���ʂ̃g���u�������΂��Ό������܂��B�������ŊJ�� �` �e�X�g�����Ă���O���[�v�����̐ݒ���Г��� DoH �T�[�r�X�Œ񋟂��A�e�X�g���{�҂� Web Browser �� DoH �� on/off ���邱�Ƃŗ��p�������؂�ւ���A�������̓e�X�g��p�� Web Browser �ł̂� DoH ���g�� ... �Ȃ�ĉ^�p�� hosts �ύX�ɂ��g���u�������点�₵�Ȃ����낤���H�Ɗ������������̍��ł��B

����ȗp�r������ [�Ȉ� DoH �T�[�o + DNS ���b�Z�[�W��� & �\�z�̃T���v���R�[�h](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) ��u���܂����̂ł�낵����΂����p���������B

