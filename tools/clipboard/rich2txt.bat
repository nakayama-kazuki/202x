@powershell "$THISFILE='%~f0'; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join [Environment]::NewLine); & $PSCODE %*" & goto:eof

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class ClipboardHtml {
	[DllImport("user32.dll")]
	public static extern bool OpenClipboard(IntPtr hWndNewOwner);
	[DllImport("user32.dll")]
	public static extern bool CloseClipboard();
	[DllImport("user32.dll")]
	public static extern IntPtr GetClipboardData(uint uFormat);
	[DllImport("kernel32.dll")]
	public static extern IntPtr GlobalLock(IntPtr hMem);
	[DllImport("kernel32.dll")]
	public static extern bool GlobalUnlock(IntPtr hMem);
	[DllImport("kernel32.dll")]
	public static extern int GlobalSize(IntPtr hMem);
	[DllImport("user32.dll")]
	public static extern uint RegisterClipboardFormat(string lpszFormat);
}
"@

$QUOT = '"'
$INDENT = '  '
$MARKER = '- '

$iElemArr = @('a', 'span', 'strong', 'em', 'b', 'i', 'code')
$bElemArr = @('div', 'p', 'section', 'article', 'blockquote')
$lElemArr = @('ul', 'ol')
$liTag = 'li'

function Convert-HtmlToText {
	param(
		[string]$in_html
	)
	$converted = ''
	$indentLevel = 0
	$inInline  = $false
	$liOpen = $false
	$fragmentArr = [regex]::Matches($in_html, '(?s)<br\s*/?>|</?\w+>|[^<]+')
	foreach ($fragment in $fragmentArr) {
		if ($fragment.Value -match '^<br') {
			$converted += "`n"
			continue
		}
		if ($fragment.Value -match '^</(\w+)>') {
			$tag = $matches[1].ToLower()
			if ($iElemArr -contains $tag) {
				$converted += $QUOT
				$inInline = $false
			} elseif ($tag -eq $liTag) {
				if ($liOpen) {
					$converted += "`n"
					$liOpen = $false
				}
			} elseif ($lElemArr -contains $tag) {
				if ($liOpen) {
					$converted += "`n"
					$liOpen = $false
				}
				$indentLevel--
				$converted += "`n"
			} elseif ($bElemArr -contains $tag) {
				$converted += "`n"
			}
			continue
		}
		if ($fragment.Value -match '^<(\w+)>') {
			$tag = $matches[1].ToLower()

			if ($iElemArr -contains $tag) {
				$converted += $QUOT
				$inInline = $true
			} elseif ($lElemArr -contains $tag) {
				if ($liOpen) {
					$converted += "`n"
					$liOpen = $false
				}
				$indentLevel++
			} elseif ($tag -eq $liTag) {
				if ($liOpen) {
					$converted += "`n"
				}
				$converted += (($INDENT * ($indentLevel - 1)) + $MARKER)
				$liOpen = $true
			}
			continue
		}
		$converted += ($fragment.Value -replace '\s+', ' ')
	}
	return [System.Net.WebUtility]::HtmlDecode($converted.TrimEnd())
}

$clipboard = [ClipboardHtml]::RegisterClipboardFormat("HTML Format")

[ClipboardHtml]::OpenClipboard([IntPtr]::Zero) | Out-Null

try {
	$hMem = [ClipboardHtml]::GetClipboardData($clipboard)
	if ($hMem -eq [IntPtr]::Zero) {
		Write-Host 'there is not rich text in the clipboard' -ForegroundColor Red
		return
	}
	$ptr = [ClipboardHtml]::GlobalLock($hMem)
	$size = [ClipboardHtml]::GlobalSize($hMem)
	$bytes = New-Object byte[] $size
	[Runtime.InteropServices.Marshal]::Copy($ptr, $bytes, 0, $size)
} finally {
	[ClipboardHtml]::GlobalUnlock($hMem) | Out-Null
	[ClipboardHtml]::CloseClipboard() | Out-Null
}

$html = [System.Text.Encoding]::UTF8.GetString($bytes)

$FRAGMENT_S = '<!--StartFragment-->'
$FRAGMENT_E = '<!--EndFragment-->'

$s = $html.IndexOf($FRAGMENT_S) + $FRAGMENT_S.Length
$e = $html.IndexOf($FRAGMENT_E)

$html = $html.Substring($s, $e - $s)
$html = [regex]::Replace($html, '<(\w+)(\s+[^>]+)>', '<$1>')

Set-Clipboard -Value (Convert-HtmlToText $html)
