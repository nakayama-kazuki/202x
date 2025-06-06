<?php

function createFile($in_data, $in_ext, $in_dir = './') {
	if (!file_exists($in_dir)) {
		mkdir($in_dir, 0777, true);
	}
	$seq = 0;
	do {
		$path = "{$in_dir}" . sprintf('%03d', $seq) . ".{$in_ext}";
		$seq++;
	} while (file_exists($path));
    file_put_contents($path, $in_data);
	return $path;
}

$posted = file_get_contents('php://input');
$decoded = json_decode($posted, true);
$saved = array();

if ($decoded === null) {
	http_response_code(400);
	echo 'invalid post data';
	exit;
} else {
	if (isset($decoded['poseImg'])) {
		$base64 = explode(',', $decoded['poseImg'])[1];
		array_push($saved, createFile(base64_decode($base64), 'png'));
	}
	if (isset($decoded['poseJson'])) {
		array_push($saved, createFile($decoded['poseJson'], 'txt'));
	}
}

http_response_code(200);
echo 'saved :';
for ($i = 0; $i < count($saved); $i++) {
	echo $saved[$i];
}

?>
