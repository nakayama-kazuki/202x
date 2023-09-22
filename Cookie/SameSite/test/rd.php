<?php

function getContext($in_method)
{
	$db = array(
		'GET' => array(
			'code' => 302,
			'html' => 'auto_href'
		),
		'POST' => array(
			'code' => 307,
			'html' => 'auto_form'
		)
	);
	if (array_key_exists($in_method, $db)) {
		return $db[$in_method];
	} else {
		exit('invalid method');
	}
}

function auto_href($in_url)
{
	print "<script>location.href = '{$in_url}';</script>\n";
}

function auto_form($in_url)
{
	print "<form action='{$in_url}' method='POST'>\n";
	foreach ($_POST as $name => $value) {
		print "\t<input type='text' name='{$name}' value='{$value}' />\n";
	}
	print "</form>\n";
	print "<script>document.getElementsByTagName('FORM').item(0).submit();</script>\n";
}

if (array_key_exists('m', $_GET) && array_key_exists('queue', $_GET)) {
	$urls = explode(',', base64_decode($_GET['queue']));
	$url = array_shift($urls);
	if (count($urls) > 0) {
		$mark = (strpos($url, '?') === FALSE) ? '?' : '&';
		$url .= "{$mark}queue=" . rtrim(base64_encode(implode(',', $urls)), '=');
	}
	$ctxt = getContext($_SERVER['REQUEST_METHOD']);
	switch ($_GET['m']) {
	case 'rd':
		// http redirect
		header("Location: {$url}", TRUE, $ctxt['code']);
		break;
	case 'cp':
		// 200 + javascript
		call_user_func($ctxt['html'], $url);
		break;
	default :
		break;
	}
} else {
	exit('param error');
}

?>
