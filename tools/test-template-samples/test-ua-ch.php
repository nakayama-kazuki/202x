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

$sc = new SessionController();

/*
	1. common parameters in each handler
*/

$sc->registerCommonParam('DOMAIN_1P', '127.0.0.1');
$sc->registerCommonParam('DOMAIN_3P', 'localhost');
$sc->registerCommonParam('ACCEPT_CH', array(
	'Sec-CH-UA-Model',
	'Sec-CH-UA-Platform-Version',
	'Sec-CH-UA-Full-Version-List'
));

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_common) {
	global $sc;
	// $sc->initLog();
	$testcases = array(
		/*
			page : n/a
				|
				+- img (1st-party) : n/a
				|
				+- img (3rd-party) : n/a
				|
				+- iframe (1st-party)
				|	|
				|	+ img (1st-party)
				|	|
				|	+ img (3rd-party)
				|
				+- iframe (3rd-party)
					|
					+ img (1st-party)
					|
					+ img (3rd-party)
		*/
		'Page-00_1st-0_3rd-0',
		/*
			page : Accept-CH
				|
				+- img (1st-party) : n/a
				|
				+- img (3rd-party) : n/a
				|
				+- iframe (1st-party)
				|	|
				|	+ img (1st-party)
				|	|
				|	+ img (3rd-party)
				|
				+- iframe (3rd-party)
					|
					+ img (1st-party)
					|
					+ img (3rd-party)
		*/
		'Page-10_1st-0_3rd-0',
		/*
			page : n/a
				|
				+- img (1st-party) : Accept-CH
				|
				+- img (3rd-party) : n/a
				|
				+- iframe (1st-party)
				|	|
				|	+ img (1st-party)
				|	|
				|	+ img (3rd-party)
				|
				+- iframe (3rd-party)
					|
					+ img (1st-party)
					|
					+ img (3rd-party)
		*/
		'Page-00_1st-1_3rd-0',
		/*
			page : n/a
				|
				+- img (1st-party) : n/a
				|
				+- img (3rd-party) : Accept-CH
				|
				+- iframe (1st-party)
				|	|
				|	+ img (1st-party)
				|	|
				|	+ img (3rd-party)
				|
				+- iframe (3rd-party)
					|
					+ img (1st-party)
					|
					+ img (3rd-party)
		*/
		'Page-00_1st-0_3rd-1',
		/*
			page : Accept-CH + Permissions-Policy
				|
				+- img (1st-party) : n/a
				|
				+- img (3rd-party) : n/a
				|
				+- iframe (1st-party)
				|	|
				|	+ img (1st-party)
				|	|
				|	+ img (3rd-party)
				|
				+- iframe (3rd-party)
					|
					+ img (1st-party)
					|
					+ img (3rd-party)
		*/
		'Page-11_1st-0_3rd-0',
		/*
			1st --> 3rd (HTTP Redirect) --> LP
		*/
		'Redirect'
	);
	print "<ul>\n";
	foreach ($testcases as $case) {
		print "\t<li><a href='" . $sc->createURL($case) ."'>{$case}</a></li>\n";
	}
	print "</ul>\n";
});

/*
	3. some handlers
*/

function ch_header($in_accept_ch_list, $in_accept_ch, $in_feature_policy, $in_permissions_policy)
{
	if ($in_accept_ch) {
		header('Accept-CH: ' . implode(', ', $in_accept_ch_list));
	}
	if ($in_feature_policy) {
		$header = 'Feature-Policy: ';
		foreach ($in_accept_ch_list as $value) {
			$header .= strtolower(substr($value, 4)) . ' *; ';
		}
		header($header);
	}
	if ($in_permissions_policy) {
		$header = 'Permissions-Policy: ';
		foreach ($in_accept_ch_list as $value) {
			$header .= strtolower(substr($value, 4)) . ' *; ';
		}
		header($header);
	}
}

$sc->registerHandler('Page-00_1st-0_3rd-0', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	$iframe1 = $sc->createURL('IFRAME');
	$iframe2 = $sc->createURL('IFRAME');
	$iframe2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $iframe2);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
<div>
<div>iframe (1st-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe1}'></iframe></div>
</div>
<div>
<div>iframe (3rd-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe2}'></iframe></div>
</div>
EOC;
});

$sc->registerHandler('Page-10_1st-0_3rd-0', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	$iframe1 = $sc->createURL('IFRAME');
	$iframe2 = $sc->createURL('IFRAME');
	$iframe2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $iframe2);
	ch_header($in_common['ACCEPT_CH'], TRUE, FALSE, FALSE);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
<div>
<div>iframe (1st-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe1}'></iframe></div>
</div>
<div>
<div>iframe (3rd-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe2}'></iframe></div>
</div>
EOC;
});

$sc->registerHandler('Page-00_1st-1_3rd-0', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '1'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	$iframe1 = $sc->createURL('IFRAME');
	$iframe2 = $sc->createURL('IFRAME');
	$iframe2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $iframe2);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
<div>
<div>iframe (1st-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe1}'></iframe></div>
</div>
<div>
<div>iframe (3rd-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe2}'></iframe></div>
</div>
EOC;
});

$sc->registerHandler('Page-00_1st-0_3rd-1', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '1'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	$iframe1 = $sc->createURL('IFRAME');
	$iframe2 = $sc->createURL('IFRAME');
	$iframe2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $iframe2);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
<div>
<div>iframe (1st-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe1}'></iframe></div>
</div>
<div>
<div>iframe (3rd-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe2}'></iframe></div>
</div>
EOC;
});

$sc->registerHandler('Page-11_1st-0_3rd-0', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	$iframe1 = $sc->createURL('IFRAME');
	$iframe2 = $sc->createURL('IFRAME');
	$iframe2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $iframe2);
	ch_header($in_common['ACCEPT_CH'], TRUE, TRUE, FALSE);
//	ch_header($in_common['ACCEPT_CH'], TRUE, FALSE, TRUE);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
<div>
<div>iframe (1st-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe1}'></iframe></div>
</div>
<div>
<div>iframe (3rd-party)</div>
<div><iframe style='border: solid 1px gray; width: 80%; height: 40%;' src='{$iframe2}'></iframe></div>
</div>
EOC;
});

$sc->registerHandler('IFRAME', function($in_common, $in_request) {
	global $sc;
	$img1 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = $sc->createURL('IMG', array('REQ_ACCEPT_CH' => '0'));
	$img2 = str_replace($in_common['DOMAIN_1P'], $in_common['DOMAIN_3P'], $img2);
	print <<<EOC
<div>
<div>subresource (1st-party)</div>
<div><img src='{$img1}' /></div>
</div>
<div>
<div>subresource (3rd-party)</div>
<div><img src='{$img2}' /></div>
</div>
EOC;
});

$sc->registerHandler('Redirect', function($in_common, $in_request) {
	global $sc;
	print <<<EOC
<div>(comming soon)</div>
EOC;
});

$sc->registerHandler('IMG', function($in_common, $in_request) {
	header('Content-Type: image/gif');
	if ($in_request['REQ_ACCEPT_CH'] === '1') {
		ch_header($in_common['ACCEPT_CH'], TRUE, FALSE, FALSE);
	}
	$img = new headerTextImage('Sec-CH-UA');
});

?>
