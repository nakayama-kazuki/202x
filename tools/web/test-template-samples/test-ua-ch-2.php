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
		$urldir = "{$_SERVER['REQUEST_SCHEME']}://{$_SERVER['HTTP_HOST']}{$parsed['dirname']}";
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
	edit below
*/

$sc = new SessionController();

/*
	0. prepare ... add these entries on hosts

> 127.0.0.1 xxx.my-1p.com
> 127.0.0.1 xxx.xxx.my-1p.com
> 127.0.0.1 yyy.my-1p.com
> 127.0.0.1 my-3p-visited.com
> 127.0.0.1 my-3p-not-yet.com

*/

/*
	1. common parameters in each handler
*/

$sc->registerCommonParam('DOMAINS', array(
	'D1P_SELF'	=> 'xxx.my-1p.com',
	'D1P_SUB'	=> 'xxx.xxx.my-1p.com',
	'D1P_OTHER'	=> 'yyy.my-1p.com',
	'D3P_VIS'	=> 'my-3p-visited.com',
	'D3P_YET'	=> 'my-3p-not-yet.com'
));

$sc->registerCommonParam('ACCEPT_CH', array(
//	'Sec-CH-UA-Model',
//	'Sec-CH-UA-Full-Version-List',
	'Sec-CH-UA-Platform-Version'
));

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_common) {
	global $sc;
	// $sc->initLog();
	$testcases = array(
		/*
			page (my-3p-visited.com) + Accept-CH
		*/
		'01-pre-test',
		/*
			page (xxx.my-1p.com)
				|
				+- UA-CH JS API
				|
				+- img (xxx.my-1p.com)
				|
				+- img (xxx.xxx.my-1p.com)
				|
				+- img (yyy.my-1p.com)
				|
				+- img (my-3p-visited.com) ... ?
				|
				+- img (my-3p-not-yet.com)
				|
				+- iframe (xxx.my-1p.com)
				|	|
				|	+ UA-CH JS API ... ?
				|	|
				|	+ img (xxx.my-1p.com)
				|	|
				|	+ img (xxx.xxx.my-1p.com)
				|	|
				|	+ img (yyy.my-1p.com)
				|	|
				|	+ img (my-3p-visited.com) ... ?
				|	|
				|	+ img (my-3p-not-yet.com)
				|
				+- iframe (my-3p-visited.com)
				|	|
				|	+ UA-CH JS API ... ?
				|	|
				|	+ img (xxx.my-1p.com)
				|	|
				|	+ img (xxx.xxx.my-1p.com)
				|	|
				|	+ img (yyy.my-1p.com)
				|	|
				|	+ img (my-3p-visited.com) ... ?
				|	|
				|	+ img (my-3p-not-yet.com)
				|
				+- iframe (my-3p-not-yet.com)
					|
					+ UA-CH JS API ... ?
					|
					+ img (xxx.my-1p.com)
					|
					+ img (xxx.xxx.my-1p.com)
					|
					+ img (yyy.my-1p.com)
					|
					+ img (my-3p-visited.com) ... ?
					|
					+ img (my-3p-not-yet.com)
		*/
		'02-test-without-accept-ch',
		/*
			page (xxx.my-1p.com) + Accept-CH
				|
				+- UA-CH JS API
				|
				+- img (xxx.my-1p.com) ... ?
				|
				+- img (xxx.xxx.my-1p.com) ... ?
				|
				+- img (yyy.my-1p.com) ... ?
				|
				+- img (my-3p-visited.com) ... ?
				|
				+- img (my-3p-not-yet.com) ... ?
				|
				+- iframe (xxx.my-1p.com)
				|	|
				|	+ UA-CH JS API ... ?
				|	|
				|	+ img (xxx.my-1p.com) ... ?
				|	|
				|	+ img (xxx.xxx.my-1p.com) ... ?
				|	|
				|	+ img (yyy.my-1p.com) ... ?
				|	|
				|	+ img (my-3p-visited.com) ... ?
				|	|
				|	+ img (my-3p-not-yet.com) ... ?
				|
				+- iframe (my-3p-visited.com)
				|	|
				|	+ UA-CH JS API ... ?
				|	|
				|	+ img (xxx.my-1p.com) ... ?
				|	|
				|	+ img (xxx.xxx.my-1p.com) ... ?
				|	|
				|	+ img (yyy.my-1p.com) ... ?
				|	|
				|	+ img (my-3p-visited.com) ... ?
				|	|
				|	+ img (my-3p-not-yet.com) ... ?
				|
				+- iframe (my-3p-not-yet.com)
					|
					+ UA-CH JS API ... ?
					|
					+ img (xxx.my-1p.com) ... ?
					|
					+ img (xxx.xxx.my-1p.com) ... ?
					|
					+ img (yyy.my-1p.com) ... ?
					|
					+ img (my-3p-visited.com) ... ?
					|
					+ img (my-3p-not-yet.com) ... ?
		*/
		'03-test-with-accept-ch'
	);
	print "<ul>\n";
	$domains = $in_common['DOMAINS'];
	foreach ($domains as $key => $val) {
		$url = "https://{$val}/";
		print "\t<li><a href='{$url}'>{$url}</a></li>\n";
	}
	foreach ($testcases as $case) {
		$url = $sc->createURL($case);
		if ($case == '01-pre-test') {
			$url = str_replace("//{$domains['D1P_SELF']}", "//{$domains['D3P_VIS']}", $url);
		}
		print "\t<li><a href='{$url}'>{$case}</a></li>\n";
	}
	print "</ul>\n";
});

/*
	3. some handlers

	'01-pre-test',
	'02-test-without-accept-ch',
	'03-test-with-accept-ch'
	'11-subresource-img'
	'12-subresource-iframe'
*/

function print_test($in_domains, $in_print_iframe = FALSE)
{
	global $sc;
	print <<<EOC
<div>UA-CH JS API : <span id='ans'>(coming soon)</span></div>
<script>
let prop = 'platformVersion';
//let prop = 'fullVersionList';
navigator.userAgentData.getHighEntropyValues([prop]).then(ua => {
	document.getElementById('ans').innerHTML = ua[prop];
});
</script>
EOC;
	$img_org = $sc->createURL('11-subresource-img');
	foreach ($in_domains as $key => $val) {
		$img_dsp = str_replace("//{$in_domains['D1P_SELF']}", "//{$val}", $img_org);
		print <<<EOC
<div>
<div>subresource ({$key})</div>
<div><img src='{$img_dsp}' /></div>
</div>
EOC;
	}
	if (!$in_print_iframe) {
		return;
	}
	$iframe_org = $sc->createURL('12-subresource-iframe');
	foreach ($in_domains as $key => $val) {
		$iframe_dsp = str_replace("//{$in_domains['D1P_SELF']}", "//{$val}", $iframe_org);
		print <<<EOC
<div>
<div>iframe ({$key})</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 65%;' src='{$iframe_dsp}'></iframe></div>
</div>
EOC;
	}
}

$sc->registerHandler('01-pre-test', function($in_common, $in_request) {
	global $sc;
	header('Accept-CH: ' . implode(', ', $in_common['ACCEPT_CH']));
	$img = $sc->createURL('11-subresource-img');
	print <<<EOC
<div>Your browser received Accept-CH Header from "{$_SERVER['HTTP_HOST']}".<div>
<div><img src='{$img}' /></div>
<ol>
<li>Reload.</li>
<li>Additional UA-CH is displayed in image.</li>
<li>Go back, and do next test.</li>
</ol>
EOC;
});

$sc->registerHandler('02-test-without-accept-ch', function($in_common, $in_request) {
	print_test($in_common['DOMAINS'], TRUE);
});

$sc->registerHandler('03-test-with-accept-ch', function($in_common, $in_request) {
	header('Accept-CH: ' . implode(', ', $in_common['ACCEPT_CH']));
	print_test($in_common['DOMAINS'], TRUE);
});

$sc->registerHandler('11-subresource-img', function($in_common, $in_request) {
	header('Content-Type: image/gif');
	$img = new headerTextImage('Sec-CH-UA');
});

$sc->registerHandler('12-subresource-iframe', function($in_common, $in_request) {
	print_test($in_common['DOMAINS'], FALSE);
});

?>
