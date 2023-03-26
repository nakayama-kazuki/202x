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

class SessionController
{
	private $handlerTable = array();
	private $script;
	private $logger;
	private $defaultId = NULL;
	private $cid_label = '_CID_';
	function __construct() {
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
	public function defaultURL() {
		return $this->script['url'];
	}
	public function createURL1($in_domain, $in_cid, $in_params = array()) {
		$buff = array();
		array_push($buff, "{$this->cid_label}={$in_cid}");
		foreach ($in_params as $key => $value) {
			array_push($buff, "{$key}=" . rawurlencode($value));
		}
		$url = $this->script['url'];
		if ($in_domain) {
			$url = str_replace($_SERVER['HTTP_HOST'], $in_domain, $url);
		}
		return "{$url}?" . implode('&', $buff);
	}
	public function createURL2($in_cid, $in_params = array()) {
		return $this->createURL1(NULL, $in_cid, $in_params);
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
	public function renderContent($in_contentId = NULL) {
		if (ob_get_contents()) {
			return;
		}
		$request = array_merge($_GET, $_POST);
		if ($in_contentId) {
			$contentId = $in_contentId;
		} else {
			$contentId = $this->defaultId;
			if (array_key_exists($this->cid_label, $request)) {
				$contentId = $request[$this->cid_label];
				unset($request[$this->cid_label]);
			}
		}
		if (array_key_exists($contentId, $this->handlerTable)) {
			call_user_func($this->handlerTable[$contentId], $request);
			$is_html = TRUE;
			$headers = headers_list();
			for ($i = 0; $i < count($headers); $i++) {
				if (stripos($headers[$i], 'content-type:') === FALSE) {
					continue;
				}
				if (stripos($headers[$i], 'text/html') === FALSE) {
					$is_html= FALSE;
				}
				break;
			}
			if ($is_html) {
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

function renderHeaderTextImage()
{
	$img = new headerTextImage();
	$img->renderContent();
}

/*
	0. edit below
*/

$sc = new SessionController();

/*
	1. common parameters in each handler
*/

define('USERDATA', array('random' => rand()));

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_request) {
	global $sc;
	// $sc->initLog();
	$url1 = $sc->createURL2('PAGE1_DISP_PARAM', USERDATA);
	$url2 = $sc->createURL1('localhost', 'PAGE2_LOGGING', USERDATA);
	$url3 = $sc->createURL1('127.0.0.1', 'PAGE3_DISP_IMG');
	print <<<EOC
<div>examples of content behavior</div>
<div>
	<form action='{$url1}' method='get'>
	<input type='text' name='GET_PARAM' />
	<input type='submit' value='test (get)' />
	</form>
</div>
<div>
	<form action='{$url1}' method='post'>
	<input type='text' name='POST_PARAM' />
	<input type='submit' value='test (post)' />
	</form>
</div>
<div><a href='{$url2}'>[see log]</a></div>
<div><a href='{$url3}'>[see img]</a></div>
EOC;
});

/*
	3.1. PAGE1_DISP_PARAM
*/

$sc->registerHandler('PAGE1_DISP_PARAM', function($in_request) {
	header('Content-Type: text/plain');
	print_r($in_request);
});

/*
	3.2. PAGE2_LOGGING
*/

$sc->registerHandler('PAGE2_LOGGING', function($in_request) {
	global $sc;
	$date = date(DATE_ATOM, time());
	foreach($in_request as $key => $val) {
		$sc->fwriteLog("{$date}:{$key}={$val}\n");
	}
	$log = $sc->loggerURL();
	$start = $sc->defaultURL();
	print <<<EOC
<div>Here is logged data.</div>
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
<div><a href='{$start}'>[back]</a></div>
EOC;
});

/*
	3.3. PAGE3_DISP_IMG
*/

$sc->registerHandler('PAGE3_DISP_IMG', function($in_request) {
	header('Content-Type: image/gif');
	renderHeaderTextImage();
});

?>
