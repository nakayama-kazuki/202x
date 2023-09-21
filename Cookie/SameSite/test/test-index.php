<?php

$FIRST = 'me.example';
$THIRD = 'you.example';

$domains = array($FIRST, $THIRD);

$parsed = pathinfo($_SERVER['SCRIPT_NAME']);

$categories = array(
	'change domain' => array(),
	'set / show cookies' => array(),
	'test cases' => array()
);

$testcases = array(
	"HTTP-Redirect @ {$THIRD} --> {$FIRST}" => array(
		"https://{$THIRD}{$parsed['dirname']}/rd.php?m=rd",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"HTTP-Redirect @ {$FIRST} --> {$FIRST}" => array(
		"https://{$FIRST}{$parsed['dirname']}/rd.php?m=rd",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"Client-Pull @ {$THIRD} --> {$FIRST}" => array(
		"https://{$THIRD}{$parsed['dirname']}/rd.php?m=cp",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"Client-Pull @ {$FIRST} --> {$FIRST}" => array(
		"https://{$FIRST}{$parsed['dirname']}/rd.php?m=cp",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	)
);

foreach ($domains as $domain) {
	array_push($categories['change domain'],
		"<a href='https://{$domain}{$parsed['dirname']}/{$parsed['basename']}'>move to {$domain}</a>");
}

foreach ($domains as $domain) {
	array_push($categories['set / show cookies'],
		"<a href='https://{$domain}{$parsed['dirname']}/set-cookies.php'>set / show cookies @ {$domain}</a>");
}

foreach ($testcases as $testcase => $urls) {
	$url = array_shift($urls);
	$mark = (strpos($url, '?') === FALSE) ? '?' : '&';
	$url .= "{$mark}queue=" . rtrim(base64_encode(implode(',', $urls)), '=');
	array_push($categories['test cases'],
		"<a href='{$url}'>{$testcase}</a>");
}

print "<ul>\n";
foreach ($categories as $categorie => $items) {
	print "\t<li>{$categorie}\n";
	print "\t\t<ul>\n";
	foreach ($items as $item) {
		print "\t\t\t<li>{$item}</li>\n";
	}
	print "\t\t</ul>\n";
	print "\t</li>\n";
}
print "</ul>\n";

?>
