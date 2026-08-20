<?php

$FIRST = 'me.example';
$THIRD = 'you.example';

$domains = array($FIRST, $THIRD);

$parsed = pathinfo($_SERVER['SCRIPT_NAME']);

$categories = array(
	'change domain' => array(),
	'test cases (GET)' => array(),
	'test cases (POST)' => array()
);

$testcases = array(
	"set / show cookies @ {$FIRST}" => array(
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"set / show cookies @ {$THIRD}" => array(
		"https://{$THIRD}{$parsed['dirname']}/set-cookies.php"
	),
	"server-side redirect @ {$THIRD} --> show cookies @ {$FIRST}" => array(
		"https://{$THIRD}{$parsed['dirname']}/rd.php?m=rd",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"server-side redirect @ {$FIRST} --> show cookies @ {$FIRST}" => array(
		"https://{$FIRST}{$parsed['dirname']}/rd.php?m=rd",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"client-side redirect @ {$THIRD} --> show cookies @ {$FIRST}" => array(
		"https://{$THIRD}{$parsed['dirname']}/rd.php?m=cp",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	),
	"client-side redirect @ {$FIRST} --> show cookies @ {$FIRST}" => array(
		"https://{$FIRST}{$parsed['dirname']}/rd.php?m=cp",
		"https://{$FIRST}{$parsed['dirname']}/set-cookies.php"
	)
);

foreach ($domains as $domain) {
	array_push($categories['change domain'],
		"<a href='https://{$domain}{$parsed['dirname']}/{$parsed['basename']}'>move to {$domain}</a>");
}

foreach ($testcases as $testcase => $urls) {
	$url = array_shift($urls);
	if (count($urls) > 0) {
		$mark = (strpos($url, '?') === FALSE) ? '?' : '&';
		$url .= "{$mark}queue=" . rtrim(base64_encode(implode(',', $urls)), '=');
	}
	array_push($categories['test cases (GET)'],
		"<a href='{$url}'>{$testcase}</a>");
	array_push($categories['test cases (POST)'],
		"<a href='#' data-url='{$url}' class='overwrite'>{$testcase}</a>");
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

<form>
	<input type='hidden' name='n1' value='v1' />
	<input type='hidden' name='n2' value='v2' />
</form>

<script>

let links = document.getElementsByClassName('overwrite');
for (let i = 0; i < links.length; i++) {
	links.item(i).addEventListener('click', (in_e) => {
		let form = document.getElementsByTagName('FORM').item(0);
		form.action = in_e.target.dataset.url;
		form.method = 'POST';
		form.submit();
	});
}

</script>
