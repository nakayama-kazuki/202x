<?php

if (array_key_exists('m', $_GET) && array_key_exists('queue', $_GET)) {
	$urls = explode(',', base64_decode($_GET['queue']));
	$url = array_shift($urls);
	if (count($urls) > 0) {
		$mark = (strpos($url, '?') === FALSE) ? '?' : '&';
		$url .= "{$mark}queue=" . rtrim(base64_encode(implode(',', $urls)), '=');
	}
	switch ($_GET['m']) {
	case 'rd':
		// http redirect
		header("Location: {$url}");
		break;
	case 'cp':
		// client-pull
		print "<script>location.href = '{$url}';</script>\n";
		break;
	default :
		break;
	}
} else {
	print 'param-error';
}


?>
