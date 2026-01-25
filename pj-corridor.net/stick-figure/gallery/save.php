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

define('DEFAULT_PICT_SIZE', 600);

function resizeImage($in_bin, $in_w = DEFAULT_PICT_SIZE, $in_h = DEFAULT_PICT_SIZE) {
	$imSrc = imagecreatefromstring($in_bin);
	$wSrc = imagesx($imSrc);
	$hSrc = imagesy($imSrc);
	$scale = min($in_w / $wSrc, $in_h / $hSrc);
	$wResized = (int)($wSrc * $scale);
	$hResized = (int)($hSrc * $scale);
	$imDst = imagecreatetruecolor($in_w, $in_h);
	imagesavealpha($imDst, true);
	$transparency = imagecolorallocatealpha($imDst, 0, 0, 0, 127);
	imagefill($imDst, 0, 0, $transparency);
	$xDst = ($in_w - $wResized) / 2;
	$yDst = ($in_h - $hResized) / 2;
	imagecopyresampled($imDst, $imSrc, $xDst, $yDst, 0, 0, $wResized, $hResized, $wSrc, $hSrc);
	ob_start();
	imagepng($imDst);
	$bin = ob_get_clean();
	imagedestroy($imSrc);
	imagedestroy($imDst);
	return $bin;
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
		$bin = resizeImage(base64_decode($base64));
		array_push($saved, createFile($bin, 'png'));
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
