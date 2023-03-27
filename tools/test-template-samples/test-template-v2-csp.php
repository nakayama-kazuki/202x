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

$sc = new SessionController();

/*

the structure of test content is as below :

	root (domain A)
		|
		+- csp : B, C is OK
		|
		+- scripts (B, C, D)
		|
		=
		|
		+- iframe (domain A)
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain A)
		|	|
		|	+- csp : B is OK
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain A)
		|	|
		|	+- csp : B, C, D is OK
		|	|
		|	+- scripts (B, C, D)
		|
		=
		|
		+- iframe (domain D)
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain D)
		|	|
		|	+- csp : B is OK
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain D)
			|
			+- csp : B, C, D is OK
			|
			+- scripts (B, C, D)

edit "hosts" as below :

	127.0.0.1 service-a.com
	127.0.0.1 service-b.com
	127.0.0.1 service-c.com
	127.0.0.1 service-d.com

edit "httpd-ssl.conf" as below :

	<VirtualHost service-a.com:443>
		DocumentRoot (depends on your env)
		ServerName service-a.com
		SSLEngine on
		SSLCertificateFile (depends on your env)
		SSLCertificateKeyFile (depends on your env)
	</VirtualHost>
	<VirtualHost service-b.com:443>
		DocumentRoot (depends on your env)
		ServerName service-b.com
		SSLEngine on
		SSLCertificateFile (depends on your env)
		SSLCertificateKeyFile (depends on your env)
	</VirtualHost>
	<VirtualHost service-c.com:443>
		DocumentRoot (depends on your env)
		ServerName service-c.com
		SSLEngine on
		SSLCertificateFile (depends on your env)
		SSLCertificateKeyFile (depends on your env)
	</VirtualHost>
	<VirtualHost service-d.com:443>
		DocumentRoot (depends on your env)
		ServerName service-d.com
		SSLEngine on
		SSLCertificateFile (depends on your env)
		SSLCertificateKeyFile (depends on your env)
	</VirtualHost>
*/

/*
	1. common
*/

define('CSP_SEPARATOR', '|');

function responseCSPHeader($in_report_id, ...$in_domains)
{
	global $sc;
	$domains = implode(' ', $in_domains);
	$report_url = $sc->createURL2('REPORT_ENTRY_POINT', array('ID' => $in_report_id));
	header("Content-Security-Policy-Report-Only: script-src 'unsafe-inline' {$domains}; report-uri {$report_url}");
}

function printScriptElems(...$in_domains)
{
	global $sc;
	foreach ($in_domains as $domain) {
		$script_url = $sc->createURL1($domain, 'ENTITY_SCRIPT_SRC');
		print "<script src='{$script_url}'></script>\n";
	}
}

function makeCSPParam(...$in_domains)
{
	return array('CSP_ALLOW' => implode(CSP_SEPARATOR, $in_domains));
}

/*
	2. default handler
*/

$sc->registerDefaultHandler(function($in_request) {
	global $sc;
	// $sc->initLog();
/*
	root (domain A)
		|
		+- csp : B, C is OK
		|
		+- scripts (B, C, D)
*/
	responseCSPHeader('ROOT', 'service-b.com', 'service-c.com');
	printScriptElems('service-b.com', 'service-c.com', 'service-d.com');
/*
		|
		+- iframe (domain A)
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain A)
		|	|
		|	+- csp : B is OK
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain A)
		|	|
		|	+- csp : B, C, D is OK
		|	|
		|	+- scripts (B, C, D)
*/
	$urls = array();
	$params = array('TESTCASE' => "service-a.com (1)");
	array_push($urls, $sc->createURL2('PAGE_IN_IFRAME', $params));
	$params = array('TESTCASE' => "service-a.com (2)");
	$params = array_merge($params, makeCSPParam('service-b.com'));
	array_push($urls, $sc->createURL2('PAGE_IN_IFRAME', $params));
	$params = array('TESTCASE' => "service-a.com (3)");
	$params = array_merge($params, makeCSPParam('service-b.com', 'service-c.com', 'service-d.com'));
	array_push($urls, $sc->createURL2('PAGE_IN_IFRAME', $params));
/*
		|
		+- iframe (domain B)
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain B)
		|	|
		|	+- csp : B is OK
		|	|
		|	+- scripts (B, C, D)
		|
		+- iframe (domain B)
			|
			+- csp : B, C, D is OK
			|
			+- scripts (B, C, D)
*/
	$params = array('TESTCASE' => "service-d.com (1)");
	array_push($urls, $sc->createURL1('service-d.com', 'PAGE_IN_IFRAME', $params));
	$params = array('TESTCASE' => "service-d.com (2)");
	$params = array_merge($params, makeCSPParam('service-b.com'));
	array_push($urls, $sc->createURL1('service-d.com', 'PAGE_IN_IFRAME', $params));
	$params = array('TESTCASE' => "service-d.com (3)");
	$params = array_merge($params, makeCSPParam('service-b.com', 'service-c.com', 'service-d.com'));
	array_push($urls, $sc->createURL1('service-d.com', 'PAGE_IN_IFRAME', $params));
	// print content
	print "<div>(@{$_SERVER['HTTP_HOST']})</div>\n";
	foreach ($urls as $url) {
		print "<iframe src='{$url}'></iframe>\n";
	}
});

/*
	3.1. ENTITY_SCRIPT_SRC
*/

$sc->registerHandler('ENTITY_SCRIPT_SRC', function($in_request) {
	header('Content-Type: text/javascript');
	header('Cache-Control: no-cache');
	print <<<EOC
document.write("<div>script from {$_SERVER['HTTP_HOST']}.</div>");
EOC;
});

/*
	3.2. REPORT_ENTRY_POINT
*/

$sc->registerHandler('REPORT_ENTRY_POINT', function($in_request) {
	global $sc;
	$date = date(DATE_ATOM, time());
	foreach($in_request as $key => $val) {
		$sc->fwriteLog("[{$date}]:{$key}={$val}\n");
	}
	$sc->fwriteLog(file_get_contents('php://input'));
	$sc->fwriteLog("\n");
});

/*
	3.3. PAGE_IN_IFRAME
*/

$sc->registerHandler('PAGE_IN_IFRAME', function($in_request) {
	global $sc;
	header('Cache-Control: no-cache');
	if (array_key_exists('CSP_ALLOW', $in_request)) {
		$domains = explode(CSP_SEPARATOR, $in_request['CSP_ALLOW']);
		responseCSPHeader("{$in_request['TESTCASE']}", ...$domains);
	}
	printScriptElems('service-b.com', 'service-c.com', 'service-d.com');
	print "<div>(@{$_SERVER['HTTP_HOST']})</div>\n";
});

/*
	3.4. BROWSE_LOG
*/

$sc->registerHandler('BROWSE_LOG', function($in_request) {
	global $sc;
	$log = $sc->loggerURL();
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
EOC;
});

// $sc->renderContent('BROWSE_LOG');

?>
