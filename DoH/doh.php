<?php

/*
	doh.php
	Copyright (c) 2022 Kazuki Nakayama
	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
*/

set_time_limit(3);

class UnitTest
{
	private $handlerNo = 1;
	private $handlerTable = array();
	function __construct($in_auto_exec = TRUE) {
		if ($in_auto_exec) {
			register_shutdown_function([$this, 'exec']);
		}
	}
	public function register($in_handler, $in_desc = '') {
		return;
		if ($in_desc) {
			$desc = $in_desc;
		} else {
			$desc = 'case (' . ($this->handlerNo++) . ')';
		}
		array_push($this->handlerTable, array($in_handler, $desc));
	}
	public function exec() {
		foreach ($this->handlerTable as $handler) {
			if (!call_user_func($handler[0])) {
				echo "'{$handler[1]}' was failed";
				exit;
			}
		}
	}
}

$ut = new UnitTest();

define('OCTET', 8);

define('BYTEx1', 1);
define('BYTEx2', 2);
define('BYTEx4', 4);

define('BYTES', array(BYTEx1, BYTEx2, BYTEx4));
define('BITS', array_map(function($e) { return $e * OCTET; }, BYTES));

function get_format_by_rule($in_rule, $in_byte)
{
	$formats = array(
		'INTERNET' => array(
			BYTEx4 => 'N',
			BYTEx2 => 'n',
			BYTEx1 => 'C'
		),
		'MACHINE' => array(
			BYTEx4 => 'L',
			BYTEx2 => 'S',
			BYTEx1 => 'C'
		)
	);
	if (array_key_exists($in_rule, $formats)) {
		if (array_key_exists($in_byte, $formats[$in_rule])) {
			return $formats[$in_rule][$in_byte];
		}
	}
	exit('get_format_by_rule() : invalid argument');
}

function get_format($in_byte)
{
	return get_format_by_rule('INTERNET', $in_byte);
	// return get_format_by_rule('MACHINE', $in_byte);
}

function unpack_substr($in_packed, $in_start, $in_byte)
{
	return unpack(get_format($in_byte), substr($in_packed, $in_start, $in_byte))[1];
}

function pack_number($in_num, $in_byte)
{
	return pack(get_format($in_byte), $in_num);
}

$ut->register(function() {
	$tests = array(0, 1, 10, 100);
	foreach ($tests as $test) {
		foreach (BYTES as $byte) {
			$result = unpack_substr(pack_number($test, $byte), 0, $byte);
			if ($result !== $test) {
				return FALSE;
			}
		}
	}
	return TRUE;
}, 'pack / unpack');

function handleBitList($in_bitList, $in_buff, $in_callback)
{
	$ret = '';
	$tmp = 0;
	$offset = 0;
	$length = 0;
	foreach ($in_bitList as $itemName => $itemBit) {
		if ($itemBit % OCTET == 0) {
			if ($tmp != 0) {
				exit("handleBitList() : {$itemName} is not octet-aligned.");
			}
			// octet-aligned data --> $in_callback
			$length = $itemBit;
		} else {
			$tmp += $itemBit;
			if ($tmp % OCTET != 0) {
				// smaller than octet
				continue;
			}
			// octet-aligned data-set --> $in_callback
			$length = $tmp;
			$tmp = 0;
		}
		// handle $in_buff from $offset to ($offset + $length)
		if (in_array($length, BITS)) {
			$ret .= call_user_func($in_callback, $in_buff, $offset, $length);
			$offset += $length;
			$length = 0;
		} else {
			exit("handleBitList() : can not handle {$length} bit.");
		}
	}
	return $ret;
}

function packToBinStr($in_pack, $in_bitList)
{
	return handleBitList(
		$in_bitList,
		$in_pack,
		function($in_buff, $in_offset, $in_length) {
			// $in_buff is $in_pack, and $in_length is in BITS
			$decNum = unpack_substr($in_buff, ($in_offset / OCTET), ($in_length / OCTET));
			$binStr = base_convert($decNum, 10, 2);
			return str_pad($binStr, $in_length, '0', STR_PAD_LEFT);
		}
	);
}

function binStrToPack($in_binStr, $in_bitList)
{
	return handleBitList(
		$in_bitList,
		$in_binStr,
		function($in_buff, $in_offset, $in_length) {
			// $in_buff is $in_binStr, and $in_length is in BITS
			$binStr = substr($in_buff, $in_offset, $in_length);
			$decNum = intval($binStr, 2);
			return pack_number($decNum, ($in_length / OCTET));
		}
	);
}

function unpackToBinStr($in_unpacked, $in_bitList)
{
	$ret = '';
	foreach ($in_unpacked as $name => $decNum) {
		$binStr = base_convert($decNum, 10, 2);
		$ret .= str_pad($binStr, $in_bitList[$name], '0', STR_PAD_LEFT);
	}
	return $ret;
}

function binStrToUnpack($in_binStr, $in_bitList)
{
	$ret = array();
	$sumBit = 0;
	foreach ($in_bitList as $name => $bit) {
		$binStr = substr($in_binStr, $sumBit, $bit);
		$ret[$name] = intval($binStr, 2);
		$sumBit += $bit;
	}
	return $ret;
}

$ut->register(function() {
	$bitlists = array(
		8 => array(
			array(1,7),
			array(8)
		),
		16 => array(
			array(1,7,8),
			array(16)
		),
		32 => array(
			array(1,15,16),
			array(32)
		)
	);
	foreach (array(8, 16, 32) as $bits) {
		$bitstr = '';
		for ($bit = 0; $bit < $bits; $bit++) {
			$bitstr .= rand(0, 1);
		}
		foreach ($bitlists[strlen($bitstr)] as $bitlist) {
			$result = packToBinStr(binStrToPack($bitstr, $bitlist), $bitlist);
			if ($result !== $bitstr) {
				return FALSE;
			}
		}
	}
	return TRUE;
}, 'binary-string');

function util_pack($in_unpacked, $in_bitList)
{
	$binStr = unpackToBinStr($in_unpacked, $in_bitList);
	return binStrToPack($binStr, $in_bitList);
}

function util_unpack($in_packed, $in_bitList)
{
	$binStr = packToBinStr($in_packed, $in_bitList);
	return binStrToUnpack($binStr, $in_bitList);
}

$ut->register(function() {
	$bitList = array(
		'a' => 16,
		'b' => 16,
		'c' => 32,
		'd' => 16
	);
	$test = array();
	foreach ($bitList as $name => $bit) {
		$test[$name] = rand(0, 2 ** $bit - 1);
	}
	$result = util_unpack(util_pack($test, $bitList), $bitList);
	if (count(array_diff_assoc($result, $test)) > 0) {
		return FALSE;
	} else {
		return TRUE;
	}
}, 'bit-list');

define('ROOTLB', 0b00000000);
define('FMASK1', 0b11000000);
define('DMASK1', ~FMASK1);
define('FMASK2', FMASK1 << OCTET);
define('DMASK2', ~FMASK2);

function unpack_dns_domain($in_packed)
{
	$ret = array(
		'unpacked' => array(),
		'consumed' => 0
	);
	$ret['consumed'] = 0;
	while (TRUE) {
		$label = unpack_substr($in_packed, $ret['consumed'], BYTEx1);
		if ($label === ROOTLB) {
			$ret['consumed'] += 1;
			break;
		} else if ($label & FMASK1) {
			// offset : is_int() = TRUE
			array_push($ret['unpacked'], unpack_substr($in_packed, $ret['consumed'], BYTEx2) & DMASK2);
			$ret['consumed'] += 2;
			break;
		} else {
			// string : is_int() = FALSE
			array_push($ret['unpacked'], substr($in_packed, $ret['consumed'] + 1, $label));
			$ret['consumed'] += 1 + ($label & DMASK1);
		}
	}
	return $ret;
}

function pack_dns_domain($in_labels)
{
	$ret = '';
	foreach ($in_labels as $label) {
		if (is_int($label)) {
			$ret .= pack_number(($label | FMASK2), BYTEx2);
			return $ret;
		} else {
			$ret .= pack_number(strlen($label), BYTEx1);
			$ret .= $label;
		}
	}
	$ret .= pack_number(ROOTLB, BYTEx1);
	return $ret;
}

$ut->register(function() {
	$tests = array(
		array('www', 'sample', 'com'),
		array('www', 1234),
		array(1234)
	);
	foreach ($tests as $test) {
		$extra = str_repeat('X', rand(0, 10));
		$result = unpack_dns_domain(pack_dns_domain($test) . $extra);
		if (count(array_diff($result['unpacked'], $test)) > 0) {
			return FALSE;
		}
	}
	return TRUE;
}, 'domain-label');

function dnsRecToTypeCode($in_rec)
{
	$recs = array(
		'A'		=> 1,
		'NS'	=> 2,
		'MX'	=> 15,
		'AAAA'	=> 28
	);
	if (array_key_exists($in_rec, $recs)) {
		return $recs[$in_rec];
	} else {
		return -1;
	}
}

function pack_to_ip($in_packed)
{
	$octet = str_split($in_packed);
	array_walk($octet, function(&$value, $key) {
		$value = strval(unpack_substr($value, 0, BYTEx1));
	});
	return implode('.', $octet);
}

function int32_to_ip($in_int32)
{
	return pack_to_ip(pack_number($in_int32, BYTEx4));
}

function ip_to_pack($in_ip)
{
	$octet = explode('.', $in_ip);
	$packed = '';
	foreach ($octet as $str) {
		$packed .= pack_number(intval($str), BYTEx1);
	}
	return $packed;
}

function ip_to_int32($in_ip)
{
	return unpack_substr(ip_to_pack($in_ip), 0, BYTEx4);
}

$ut->register(function() {
	$int32 = rand(0, 2 ** 32 - 1);
	$result = ip_to_int32(int32_to_ip($int32));
	if ($int32 === $result) {
		return TRUE;
	} else {
		return FALSE;
	}
}, 'IP <---> INT');

class DNSMsg
{
	const HEADER = [
		'ID'		=> 16,
		'F_QR'		=> 1,
		'F_OPCODE'	=> 4,
		'F_AA'		=> 1,
		'F_TC'		=> 1,
		'F_RD'		=> 1,
		'F_RA'		=> 1,
		'F_Z'		=> 1,
		'F_AD'		=> 1,
		'F_CD'		=> 1,
		'F_RCODE'	=> 4,
		'QDCOUNT'	=> 16,
		'ANCOUNT'	=> 16,
		'NSCOUNT'	=> 16,
		'ARCOUNT'	=> 16
	];
	const QDSECTION = [
		// 'DOMAIN'	=> 'variable',
		'TYPE'		=> 16,
		'CLASS'		=> 16
	];
	const RESRECORD = [
		// 'DOMAIN'	=> 'variable',
		'TYPE'		=> 16,
		'CLASS'		=> 16,
		'TTL'		=> 32,
		'RDLEN'		=> 16
		// 'RDATA'	=> 'variable'
	];
	private function _unpack($in_packed, $in_bitList) {
		// DOMAIN
		$domain = unpack_dns_domain($in_packed);
		$consumed = $domain['consumed'];
		// TYPE, etc ...
		$bitListLen = array_sum($in_bitList) / OCTET;
		$unpacked = util_unpack(substr($in_packed, $consumed, $bitListLen), $in_bitList);
		$consumed += $bitListLen;
		// RDATA
		if (array_key_exists('RDLEN', $unpacked)) {
			$unpacked['RDATA'] = substr($in_packed, $consumed, $unpacked['RDLEN']);
			if (dnsRecToTypeCode('A') === $unpacked['TYPE']) {
				$unpacked['RDATA'] = pack_to_ip($unpacked['RDATA']);
			}
			$consumed += $unpacked['RDLEN'];
		}
		return array(
			'unpacked' => array_merge(array('DOMAIN' => $domain['unpacked']), $unpacked),
			'consumed' => $consumed
		);
	}
	private function _unpack_loop($in_packed, $in_bitList, $in_count) {
		$ret = array(
			'unpacked' => array(),
			'consumed' => 0
		);
		for ($i = 0; $i < $in_count; $i++) {
			$buff = $this->_unpack(substr($in_packed, $ret['consumed']), $in_bitList);
			$ret['consumed'] += $buff['consumed'];
			array_push($ret['unpacked'], $buff['unpacked']);
		}
		return $ret;
	}
	function unpack($in_packed) {
		// HEADER
		$consumed = 0;
		$byte = array_sum(self::HEADER) / OCTET;
		$header = util_unpack(substr($in_packed, $consumed, $byte), self::HEADER);
		// QDSECTION
		$consumed += $byte;
		$qdsections = $this->_unpack_loop(
			substr($in_packed, $consumed), self::QDSECTION, $header['QDCOUNT']);
		// RESRECORD (AN)
		$consumed += $qdsections['consumed'];
		$ansections = $this->_unpack_loop(
			substr($in_packed, $consumed), self::RESRECORD, $header['ANCOUNT']);
		// RESRECORD (NS)
		$consumed += $ansections['consumed'];
		$nssections = $this->_unpack_loop(
			substr($in_packed, $consumed), self::RESRECORD, $header['NSCOUNT']);
		// RESRECORD (AR)
		$consumed += $nssections['consumed'];
		$arsections = $this->_unpack_loop(
			substr($in_packed, $consumed), self::RESRECORD, $header['ARCOUNT']);
		return array(
			'HEADER'		=> $header,
			'QDSECTIONS'	=> $qdsections['unpacked'],
			'ANSECTIONS'	=> $ansections['unpacked'],
			'NSSECTIONS'	=> $nssections['unpacked'],
			'ARSECTIONS'	=> $arsections['unpacked']
		);
	}
	private function _pack($in_unpacked, $in_bitList) {
		foreach ($in_unpacked as $key => $value) {
			if (($key === 'DOMAIN') || ($key === 'RDATA')) {
				continue;
			} else {
				$unpacked[$key] = $value;
			}
		}
		// DOMAIN
		$packed = pack_dns_domain($in_unpacked['DOMAIN']);
		// TYPE, etc ...
		$packed .= util_pack($unpacked, $in_bitList);
		// RDATA
		if (array_key_exists('RDATA', $in_unpacked)) {
			if (dnsRecToTypeCode('A') === $in_unpacked['TYPE']) {
				$packed .= ip_to_pack($in_unpacked['RDATA']);
			} else {
				$packed .= $in_unpacked['RDATA'];
			}
		}
		return $packed;
	}
	function pack($in_unpacked) {
		$packed = util_pack($in_unpacked['HEADER'], self::HEADER);
		foreach ($in_unpacked['QDSECTIONS'] as $qdsection) {
			$packed .= $this->_pack($qdsection, self::QDSECTION);
		}
		foreach ($in_unpacked['ANSECTIONS'] as $ansection) {
			$packed .= $this->_pack($ansection, self::RESRECORD);
		}
		foreach ($in_unpacked['NSSECTIONS'] as $nssection) {
			$packed .= $this->_pack($nssection, self::RESRECORD);
		}
		foreach ($in_unpacked['ARSECTIONS'] as $arsection) {
			$packed .= $this->_pack($arsection, self::RESRECORD);
		}
		return $packed;
	}
	function createRequest($in_domain) {
		$unpacked = array(
			'HEADER' => array(
				'ID' => rand(0, 2 ** 16 - 1),
				'F_QR' => 0, // request
				'F_OPCODE' => 0, // 0 : normal, 4 : notify, 5 : update
				'F_AA' => 0, // 1 : admin
				'F_TC' => 0, // 1 : truncated
				'F_RD' => 1, // 0 : authoritative, 1 : cache
				'F_RA' => 1, // 1 : resolve
				'F_Z' => 0, // reserverd
				'F_AD' => 0, // 1 : can use DNSSEC
				'F_CD' => 0, // 1 : can't use DNSSEC
				'F_RCODE' => 0, // 1 : error
				'QDCOUNT' => 1,
				'ANCOUNT' => 0,
				'NSCOUNT' => 0,
				'ARCOUNT' => 0
			),
			'QDSECTIONS' => array(
				array(
					'DOMAIN' => explode('.', $in_domain),
					'TYPE' => dnsRecToTypeCode('A'),
					'CLASS' => 1 // IN
				)
			),
			'ANSECTIONS' => array(),
			'NSSECTIONS' => array(),
			'ARSECTIONS' => array()
		);
		return $this->pack($unpacked);
	}
	function createResponse($in_unpacked_request, $in_ip) {
		$unpacked = $this->unpack($in_unpacked_request);
		$unpacked['HEADER']['F_QR'] = 1; // response
		$unpacked['HEADER']['ANCOUNT'] = 1;
		$unpacked['ANSECTIONS'] = array();
		array_push($unpacked['ANSECTIONS'], array(
			'DOMAIN' => $unpacked['QDSECTIONS'][0]['DOMAIN'],
			'TYPE' => dnsRecToTypeCode('A'),
			'CLASS' => 1, // IN
			'TTL' => 5,
			'RDLEN' => 4,
			'RDATA' => $in_ip
		));
		return $this->pack($unpacked);
	}
}

$ut->register(function() {
	$dns = new DNSMsg();
	$packed = $dns->createRequest('www.yahoo.co.jp');
	$result = $dns->pack($dns->unpack($packed));
	if ($result === $packed) {
		return TRUE;
	} else {
		return FALSE;
	}
}, 'DNS (request)');

$ut->register(function() {
	$dns = new DNSMsg();
	$packed = $dns->createResponse($dns->createRequest('www.yahoo.co.jp'), '1.2.3.4');
	$result = $dns->pack($dns->unpack($packed));
	if ($result === $packed) {
		return TRUE;
	} else {
		return FALSE;
	}
}, 'DNS (response)');

//define('DNSADDR', '1.1.1.1');
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

function getDomainFromQd($in_packed)
{
	$dns = new DNSMsg();
	$unpacked = $dns->unpack($in_packed);
	return implode('.', $unpacked['QDSECTIONS'][0]['DOMAIN']);
}

function getIpFromAn($in_packed)
{
	$dns = new DNSMsg();
	$unpacked = $dns->unpack($in_packed);
	foreach ($unpacked['ANSECTIONS'] as $ansection) {
		if ($ansection['TYPE'] === dnsRecToTypeCode('A')) {
			return $ansection['RDATA'];
		}
	}
	return NULL;
}

function logging($in_value)
{
	$info = pathinfo($_SERVER['SCRIPT_NAME']);
	$logfile = "{$_SERVER['DOCUMENT_ROOT']}{$info['dirname']}/{$info['filename']}.log";
	$fp = fopen($logfile, 'a');
	flock($fp, LOCK_EX);
	fwrite($fp, $in_value);
	flock($fp, LOCK_UN);
	fclose($fp);
}

define('DISP_HEXPREFIX', '0x');
define('DISP_CTRLCODE', '.');
define('DISP_SEPARATOR', ' | ');

function debugFormatUnpack($in_packed)
{
	$dns = new DNSMsg();
	return var_export($dns->unpack($in_packed), TRUE);
}

function debugFormatBinary($in_packed)
{
	$consumed = 0;
	$packed = '';
	$output = '';
	while ($consumed < strlen($in_packed)) {
		$dec = unpack_substr($in_packed, $consumed++, BYTEx1);
		$output .= DISP_HEXPREFIX . str_pad(base_convert($dec, 10, 16), 2, '0', STR_PAD_LEFT);
		if ($consumed % OCTET === 0) {
			$output .= DISP_SEPARATOR . $packed . PHP_EOL;
			$packed = '';
		} else {
			$output .= chr(0x20);
		}
		if ((31 < $dec) && ($dec < 127)) {
			$packed .= pack_number($dec, BYTEx1);
		} else {
			$packed .= DISP_CTRLCODE;
		}
	}
	return $output;
}

function debugFormat($in_packed)
{
	return debugFormatBinary($in_packed);
	// return debugFormatUnpack($in_packed);
}

function EOL($in_cnt)
{
	$ret = '';
	while ($in_cnt-- > 0) {
		$ret .= PHP_EOL;
	}
	return $ret;
}

function printHttp($in_headline, $in_headers, $in_entityBody)
{
	print $in_headline . EOL(2);
	foreach ($in_headers as $key => $value) {
		print "{$key}: {$value}" . EOL(1);
	}
	print EOL(1);
	print $in_entityBody;
	print EOL(2);
}

function printHttpRequest($in_packed)
{
	$domain = getDomainFromQd($in_packed);
	if (!$domain) {
		$domain = 'n/a';
	}
	printHttp(
		"( Browser ---> DoH : {$domain} )",
		apache_request_headers(),
		debugFormat($in_packed)
	);
}

function printHttpResponse($in_packed)
{
	$ip = getIpFromAn($in_packed);
	if (!$ip) {
		$ip = 'n/a';
	}
	printHttp(
		"( Browser <--- DoH : {$ip} )",
		apache_response_headers(),
		debugFormat($in_packed)
	);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	// DoH I/F
	$request = file_get_contents('php://input');
	$response = getDnsResponse($request);
	$headers = array(
		'Content-Type: application/dns-message',
		'Content-Length: ' . strlen($response),
		'Set-Cookie: dohcookie='  . rand(0, 99) . '; Secure; HttpOnly'
	);
	foreach ($headers as $header) {
		header($header);
	}
	printHttpRequest($request);
	printHttpResponse($response);
	logging(ob_get_clean());
	print $response;
} else {
	// Web I/F
	if (array_key_exists('domain', $_GET)) {
		header('Content-Type: text/plane;');
		$dns = new DNSMsg();
		$request = $dns->createRequest($_GET['domain']);
		$response = getDnsResponse($request);
		printHttpRequest($request);
		printHttpResponse($response);
	} else {
		print <<<EOFORM
<form method='GET'>
<input type='text' name='domain' placeholder='domain name' />
</form>
EOFORM;
	}
}

?>
