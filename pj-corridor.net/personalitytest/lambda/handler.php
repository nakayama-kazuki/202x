<?php

$event = json_decode(stream_get_contents(STDIN), true);

echo json_encode([
	'statusCode' => 200,
	'headers' => ['Content-Type' => 'text/plain'],
	'body' => print_r($event, true)
]);

?>
