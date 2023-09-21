<?php

$samesite_values = array('strict', 'lax', 'none');

$cookies = array();

foreach ($samesite_values as $samesite_value) {
	array_push($cookies,
		array(
			'NAME' => $samesite_value,
			'VALUE' => md5(rand()),
			'OPTIONS' => array(
				'secure' => TRUE,
				'samesite' => $samesite_value
			)
		)
	);
}

foreach ($cookies as $cookie) {
	setcookie($cookie['NAME'], $cookie['VALUE'], $cookie['OPTIONS']);
}

print "<div>received :</div>\n";
foreach ($_COOKIE as $key => $value) {
	print "<div>samaesite={$key}:{$value}</div>\n";
}

?>
