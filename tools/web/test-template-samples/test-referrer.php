<?php

function supportMutateAction()
{
	/*
		its <query> component is replaced by query
		https://www.w3.org/TR/2011/WD-html5-20110525/association-of-controls-and-forms.html#submit-mutate-action
	*/
	print <<<EOC

<script>
window.addEventListener('load', () => {
	let forms = document.getElementsByTagName('FORM');
	for (let i = 0; i < forms.length; i++) {
		let form = forms.item(i);
		if (form.method.toUpperCase() !== 'GET') {
			continue;
		}
		let parsed = new URL(form.action);
		if (!parsed.search) {
			continue;
		}
		let params = parsed.search.substr(1).split('&');
		params.forEach(param => {
			let name, value;
			[name, value] = param.split('=');
			let input = document.createElement('INPUT');
			input.type = 'hidden';
			input.name = name;
			if (value) {
				input.value = decodeURIComponent(value);
			}
			form.appendChild(input);
		});
	}
});
</script>
EOC;
}

function typeIs($in_type)
{
	$type = str_replace('/', '\/', strtoupper($in_type));
	$headers = headers_list();
	for ($i = 0; $i < count($headers); $i++) {
		if (!preg_match('/CONTENT-TYPE:/i', $headers[$i])) {
			continue;
		}
		if (preg_match("/{$type}/i", $headers[$i])) {
			return TRUE;
		} else {
			return FALSE;
		}
	}
	$default = 'text/html';
	return preg_match("/{$type}/i", $default);
}

class SessionController
{
	private $handlerTable = array();
	private $commonParams = array();
	private $cidField;
	private $script;
	private $logger;
	private $defaultId = NULL;
	private $rendered = FALSE;
	function __construct() {
		$this->cidField = md5('');
		$parsed = pathinfo($_SERVER['SCRIPT_NAME']);
		$urldir = "https://{$_SERVER['HTTP_HOST']}{$parsed['dirname']}";
		$sysdir = "{$_SERVER['DOCUMENT_ROOT']}{$parsed['dirname']}";
		// $ext = 'txt';
		$ext = 'log';
		$this->script = array(
			'url' => "{$urldir}/{$parsed['basename']}",
			'sys' => "{$sysdir}/{$parsed['basename']}"
		);
		$this->logger = array(
			'url' => "{$urldir}/{$parsed['filename']}.{$ext}",
			'sys' => "{$sysdir}/{$parsed['filename']}.{$ext}"
		);
		register_shutdown_function([$this, 'renderContent']);
	}
	public function registerDefaultHandler($in_handler) {
		$this->defaultId = md5(rand());
		$this->registerHandler($this->defaultId, $in_handler);
	}
	public function registerHandler($in_cid, $in_handler) {
		$this->handlerTable[$in_cid] = $in_handler;
	}
	public function registerCommonParam($in_name, $in_value) {
		$this->commonParams[$in_name] = $in_value;
	}
	public function createURL($in_cid, $in_params = array()) {
		$buff = array();
		array_push($buff, "{$this->cidField}={$in_cid}");
		foreach ($in_params as $key => $value) {
			array_push($buff, "{$key}=" . rawurlencode($value));
		}
		return $this->script['url'] . '?' . implode('&', $buff);
	}
	public function loggerURL() {
		return $this->logger['url'];
	}
	public function initLog() {
		if (file_exists($this->logger['sys'])) {
			unlink($this->logger['sys']);
		}
	}
	public function fwriteLog($in_value, $in_option = 'a') {
		$fp = fopen($this->logger['sys'], $in_option);
		fwrite($fp, $in_value);
		fclose($fp);
	}
	public function renderContent() {
		if ($this->rendered) {
			return;
		} else {
			$this->rendered = TRUE;
		}
		$request = array_merge($_GET, $_POST);
		$contentId = $this->defaultId;
		if (array_key_exists($this->cidField, $request)) {
			$contentId = $request[$this->cidField];
			unset($request[$this->cidField]);
		}
		if (array_key_exists($contentId, $this->handlerTable)) {
			call_user_func($this->handlerTable[$contentId], $this->commonParams, $request);
			if (typeIs('text/html')) {
				supportMutateAction();
			}
		} else {
			header('Content-Type: text/plain');
			print 'call registerDefaultHandler() API.';
		}
	}
}

class textImage
{
	private const FONTSIZE = 5;
	private const IMGMARGIN = 10;
	private const BG = array(0, 0, 255);
	private const FG = array(255, 255, 255);
	private $fontW;
	private $fontH;
	private $texts;
	function __construct($in_texts = array()) {
		$this->fontW = imagefontwidth(self::FONTSIZE);
		$this->fontH = imagefontheight(self::FONTSIZE);
		$this->texts = $in_texts;
		register_shutdown_function([$this, 'renderContent']);
	}
	public function renderContent() {
		$maxw = 0;
		$maxh = 0;
		foreach ($this->texts as $text) {
			$w = $this->fontW * strlen($text);
			if ($w > $maxw) {
				$maxw = $w;
			}
			$maxh += $this->fontH;
		}
		$maxw += self::IMGMARGIN * 2;
		$maxh += self::IMGMARGIN * 2;
		$im = imagecreate($maxw, $maxh);
		list($r, $g, $b) = self::BG;
		$bg = imagecolorallocate($im, $r, $g, $b);
		list($r, $g, $b) = self::FG;
		$fg = imagecolorallocate($im, $r, $g, $b);
		for ($y = 0; $y < count($this->texts); $y++) {
			for ($x = 0; $x < strlen($this->texts[$y]); $x++) {
				$xpos = $x * $this->fontW + self::IMGMARGIN;
				$ypos = $y * $this->fontH + self::IMGMARGIN;
				imagechar($im, self::FONTSIZE, $xpos, $ypos, substr($this->texts[$y], $x, 1), $fg);
			}
		}
		imagegif($im);
		imagedestroy($im);
	}
}

class headerTextImage extends textImage
{
	private const TEXTMAXLEN = 70;
	private const OMITTED = ' ...';
	function __construct($in_targetHeader = NULL) {
		$headers = apache_request_headers();
		$texts = array();
		$textlen = self::TEXTMAXLEN - strlen(self::OMITTED);
		foreach ($headers as $key => $val) {
			if ($in_targetHeader) {
				if (strpos(strtoupper($key), strtoupper($in_targetHeader)) === FALSE) {
					continue;
				}
			}
			$buff = "{$key}: {$val}";
			if (strlen($buff) > $textlen) {
				$buff = substr($buff, 0, $textlen) . self::OMITTED;
			}
			array_push($texts, $buff);
		}
		parent::__construct($texts);
	}
}

/*
	0. edit below
*/

/*

1st.com
    |
    +- HTTP Referer : prev
    |
    +- document.referrer : prev
    |
    +- subresource image
    |   |
    |   +- HTTP Referer : 1st.com
    |
    +- iframe (3rd.com)
        |
        +- HTTP Referer : 1st.com
        |
        +- document.referrer : 1st.com
        |
        +- subresource image
            |
            +- HTTP Referer : 3rd.com

*/

$sc = new SessionController();

/*
	1. common parameters in each handler / functions
*/

function renderTabel($in_image_url)
{
	$ref = '(none)';
	if (array_key_exists('HTTP_REFERER', $_SERVER)) {
		$ref = $_SERVER['HTTP_REFERER'];
	}
	print <<<EOC
<style type='text/css'>
TD {
	margin : 3px;
	border : solid 1px black;
}
IFRAME {
	width: 90%;
	height: 500px;
}
</style>
<table>
	<tr>
		<td>HTTP Referer</td>
		<td>{$ref}</td>
	</tr>
	<tr>
		<td>document.referrer</td>
		<td id='docref'></td>
	</tr>
	<tr>
		<td>subresource (img)</td>
		<td><img src='{$in_image_url}' /></td>
	</tr>
</table>
<script>
document.getElementById('docref').innerText = document.referrer;
</script>
EOC;
}

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_common) {
	global $sc;
	renderTabel($sc->createURL('URL_IMAGE'));
	$iframe = $sc->createURL('URL_IFRAME1');
	print "<div><iframe src='{$iframe}'></iframe></div>\n";
});

/*
	3. some handlers
*/

$sc->registerHandler('URL_IFRAME1', function($in_common, $in_request) {
	global $sc;
	renderTabel($sc->createURL('URL_IMAGE'));
	$iframe = $sc->createURL('URL_IFRAME2');
	print "<div><iframe src='{$iframe}'></iframe></div>\n";
});

$sc->registerHandler('URL_IFRAME2', function($in_common, $in_request) {
	global $sc;
	renderTabel($sc->createURL('URL_IMAGE'));
});

$sc->registerHandler('URL_IMAGE', function($in_common, $in_request) {
	header('Content-Type: image/gif');
	$img = new headerTextImage('Referer');
});

?>
