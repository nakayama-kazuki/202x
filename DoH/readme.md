# DoH �̋C�ɂȂ� Browser �������m�F���Ă݂�

����ɂ��́A�L���G���W�j�A�̒��R�ł��B<br />

���͑傫���v���C�o�V�[�ی�ƍL���G�R�V�X�e�����W�̗������f���A�����ł� 3rd-party Cookie EOL �̃j���[�X�Ɉ���J������X���߂����Ă���܂��B<br />

������ DNS over HTTPS�i�ȉ� DoH�j�̋C�ɂȂ� �c �Ƃ�킯�v���C�o�V�[�ϓ_�ɂ����� Browser �����ɂ��ċL���ɂ��Ă݂����Ǝv���܂��B<br />

�Ƃ���ŁA�F����͊��� DoH �������ꂽ�ł��傤���H<br />

[Mozilla �ɂ���](https://wiki.mozilla.org/Trusted_Recursive_Resolver)<br />

> DNS-over-HTTPS (DoH) allows DNS to be resolved with enhanced privacy, secure transfers and comparable performance

�������� DoH �𗘗p���邱�Ƃ� User-Agent �� DNS �L���b�V���T�[�o�Ԃ̒ʐM���u�����v�u��₁v�u�Ȃ肷�܂��v������A�v���C�o�V�[�ƃZ�L�����e�B�[�̉��P���]�߂܂��B<br />

���̈���� [RFC 8484](https://tools.ietf.org/html/rfc8484) �ɂ� �c

> The DoH protocol design allows applications to fully leverage the HTTP ecosystem, including features that are not enumerated here. Utilizing the full set of HTTP features enables DoH to be more than an HTTP tunnel, but it is at the cost of opening up implementations to the full set of privacy considerations of HTTP.

HTTP ���J�j�Y�������p����̂͂悢���A�v���o�V�[�ɋC��t���܂��傤�A�Ƃ����L�ڂ�<br />

> Determining whether or not a DoH implementation requires HTTP cookie [RFC6265] support is particularly important because HTTP cookies are the primary state tracking mechanism in HTTP. HTTP cookies SHOULD NOT be accepted by DOH clients unless they are explicitly required by a use case.

�Ƃ�킯�v���C�o�V�[�����ɂ����� Browser �͊�{�I�ɂ� Cookie �̎󂯓���ɐT�d�ɂȂ�ׂ��A�Ƃ������L�ڂ�������܂��B<br />

Cloudflare �� [Example](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/) �� Set-Cookie ���܂� DoH ���X�|���X�̗Ⴊ������܂����A���̈����ɂ���Ăǂ̂悤�ȃv���C�o�V�[��̋��Ђ�������̂ł��傤���H<br />

�Ⴆ�Έ��ӂ��� DoH �T�[�r�X�����[�U�[�A�J�E���g�Ɩ��O�����v����R�Â��A�����֐S���Ƃ��Ē~�ς��đ�O�Ғ񋟂��铙�̃��[�X�P�[�X���l�����܂��B<br />

�����{�������i�ɋ߂������j�������̒m��Ȃ��Ԃɑ�O�҂ɂ킽���Ă��܂��Ƃ���΃v���C�o�V�[��̋��ЂɂȂ邱�Ƃ͊ԈႢ����܂���B<br />

## DoH x Cookie �̃e�X�g�V�i���I

�ł́A���ۂɂ��̂悤�Ȃ��Ƃ��\�Ȃ̂��𒲍����Ă݂܂��B<br />

�ȉ��͊Ȉ� DoH �T�[�o�i+ HTTP Set-Cookie�j�̎����ł��B<br />

DoH ���N�G�X�g�� Google �� DNS �ɓ]�����A���̌��ʂ� DoH ���X�|���X�Ƃ��Ă��邾���ł����A���̍ۂ� Set-Cookie ���t�^���Ă��܂��B<br />

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

�Ȉ� DoH �T�[�o���g���Ĉȉ��̃��i���I���e�X�g���܂��B

1. DoH ���X�|���X�� Set-Cookie ���󂯂� Browser ��
	1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩
	2. �ʏ�� Web �u���E�W���O�iHTTP ���N�G�X�g�j�ł��� Cookie �𑗐M���邩
2. �ʏ�� Web �u���E�W���O�iHTTP ���X�|���X�ŁjSet-Cookie ���󂯂� Browser ��
	1. DoH ���N�G�X�g�ł��� Cookie �𑗐M���邩

���p����u���E�U�̃o�[�W�����͈ȉ��̒ʂ�ł��B

- Chrome 103.0.5060.134
- Firefox 103.0
- Microsoft Edge 103.0.1264.71

## DoH x Cookie �̃e�X�g����

�i�\�ƃ��O�j

## �܂Ƃ�

���񗘗p���� Browser �̎����ł̓V�i���I 1-1, 1-2, 2-1 �Ƃ��� Cookie �͑��M���ꂸ�A�䂦�� DoH �T�[�r�X�Ɉ��ӂ������Ă��A���[�U�[�����ʂ�����ł̋����֐S���̒~�ς͓���A�Ƃ������Ƃ��m�F�ł��܂����B�v���C�o�V�[�ƃZ�L�����e�B�[�̉��P��]�ޕ��� DoH �̊��p�������������������I<br />

�]�k�ł��� Web �A�v���P�[�V�����̊J�� �` �e�X�g�̍ۂɂ͂��΂��� hosts ��ύX���܂����A���܂ɐݒ�~�X�⌳�ɖ߂��̂�Y�ꂽ�g���u�����������܂��B<br />

�������ŊJ�� �` �e�X�g�����Ă���O���[�v�����̐ݒ�� DoH �T�[�r�X�Œ񋟂��A�e�X�g���{�҂� User-Agent �� DoH �� on/off ���邱�Ƃŗ��p�������؂�ւ���A�������̓e�X�g��p�̃u���E�U�ł̂� DoH ���g�� ... �Ȃ�ĉ^�p�� hosts �ύX�ɂ��g���u�������点�Ȃ����낤���H�Ǝv���������̍��ł��B<br />

����ȗp�r������ [�Ȉ� DoH �T�[�o + DNS ���b�Z�[�W��� & �\�z�̃T���v���R�[�h](https://github.com/nakayama-kazuki/202x/blob/main/DoH/doh.php) ��u���܂����̂ł�낵����΂����p���������B<br />
