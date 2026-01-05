<?php

function request(): array {
	if (getenv('AWS_LAMBDA_RUNTIME_API')) {
		$ev = json_decode(stream_get_contents(STDIN), true);
		return [
			'method'  => $ev['requestContext']['http']['method'] ?? '',
			'path'	  => $ev['rawPath'] ?? '',
			'query'   => $ev['queryStringParameters'] ?? [],
			'headers' => $ev['headers'] ?? [],
			'cookies' => $ev['cookies'] ?? [],
			'body'	  => $ev['body'] ?? ''
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
	if (getenv('AWS_LAMBDA_RUNTIME_API')) {
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
