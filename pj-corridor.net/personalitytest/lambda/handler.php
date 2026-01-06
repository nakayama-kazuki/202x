<?php

define('IS_LAMBDA', isset($_ENV['AWS_LAMBDA_FUNCTION_NAME']));

function request(): array {
	if (IS_LAMBDA) {
		$ev = json_decode(stream_get_contents(STDIN), true);
		$wouldDecode = !empty($ev['isBase64Encoded']);
		$body = $wouldDecode ? base64_decode($ev['body'], true) : ($ev['body'] ?? '');
		return [
			'method'  => $ev['requestContext']['http']['method'] ?? '',
			'path'	  => $ev['rawPath'] ?? '',
			'query'   => $ev['queryStringParameters'] ?? [],
			'headers' => $ev['headers'] ?? [],
			'cookies' => $ev['cookies'] ?? [],
			'body'	  => $body
		];
	} else {
		return [
			'method'  => $_SERVER['REQUEST_METHOD'] ?? '',
			'path'	  => parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH),
			'query'   => $_GET,
			'headers' =>  apache_request_headers(),
			'cookies' => $_COOKIE,
			'body'	  => file_get_contents('php://input')
		];
	}
}

function response($in_status, $in_headers, $in_body): void {
	if (IS_LAMBDA) {
		print json_encode([
			'statusCode' => $in_status,
			'headers' => $in_headers,
			'body' => $in_body
		]);
	} else {
		http_response_code($in_status);
		foreach ($in_headers as $key => $value) {
			header("{$key}: {$value}");
		}
		print $in_body;
	}
}

response(200, ['Content-Type' => 'text/plain'], print_r(request(), true));

?>
