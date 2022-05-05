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
	private const TEXTMAXLEN = 75;
	function __construct($in_targetHeader = NULL) {
		$headers = apache_request_headers();
		$texts = array();
		foreach ($headers as $key => $val) {
			if ($in_targetHeader) {
				if (strpos(strtoupper($key), strtoupper($in_targetHeader)) === FALSE) {
					continue;
				}
			}
			$buff = "{$key}: {$val}";
			if (strlen($buff) > self::TEXTMAXLEN) {
				$buff = substr($buff, 0, self::TEXTMAXLEN) . ' ...';
			}
			array_push($texts, $buff);
		}
		parent::__construct($texts);
	}
}

/*
	0. edit below
*/

$sc = new SessionController();

/*
	1. common parameters in each handler
*/

$sc->registerCommonParam('USERDATA1', array('red', 'green', 'blue'));
$sc->registerCommonParam('USERDATA2', 'hello, world');

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_common) {
	global $sc;
	// $sc->initLog();
	$additional = array('EX_QUERY' => 'some_value');
	$url1 = $sc->createURL('EX_PAGE1', $additional);
	$url2 = $sc->createURL('EX_PAGE2');
	$url3 = $sc->createURL('EX_PAGE3');
	$url4 = $sc->createURL('EX_PAGE4');
	print <<<EOC
<html>
<body>
<div>examples of content behavior</div>
<div>
	<form action='{$url1}' method='get'>
	<input type='text' name='EX_DATA1' />
	<input type='submit' value='test #1' />
	</form>
</div>
<div>
	<form action='{$url2}' method='get'>
	<input type='text' name='EX_DATA2' />
	<input type='submit' value='test #2' />
	</form>
</div>
<div><a href='{$url3}'>[see log]</a></div>
<div><a href='{$url4}'>[see img]</a></div>
</body>
</html>
EOC;
});

/*
	3. some handlers
*/

$sc->registerHandler('EX_PAGE1', function($in_common, $in_request) {
	header('Content-Type: text/plain');
	print_r($in_common);
	print "\n";
	print_r($in_request);
});

$sc->registerHandler('EX_PAGE2', function($in_common, $in_request) {
	global $sc;
	$sc->fwriteLog($in_request['EX_DATA2']);
	$sc->fwriteLog("\n");
	print <<<EOC
<html>
<body>
<div>text : {$in_request['EX_DATA2']}</div>
</body>
</html>
EOC;
});

$sc->registerHandler('EX_PAGE3', function($in_common, $in_request) {
	global $sc;
	$log = $sc->loggerURL();
	print <<<EOC
<html>
<body>
<textarea style='width: 80%; height: 200px;'></textarea>
<script>

let wait_report_uri_ms = 500;
window.setTimeout(function() {
	fetch('{$log}')
		.then(res => res.ok ? res.text() : Promise.reject(new Error('404')))
		.then(txt => document.getElementsByTagName('TEXTAREA').item(0).value = txt)
		.catch(err => console.log(err));
}, wait_report_uri_ms);

</script>
</body>
</html>
EOC;
});

$sc->registerHandler('EX_PAGE4', function($in_common, $in_request) {
	header('Content-Type: image/gif');
	$img = new headerTextImage();
});

?>
