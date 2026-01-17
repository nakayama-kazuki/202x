@powershell "$THISFILE='%~f0'; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join [Environment]::NewLine); & $PSCODE %*" & goto:eof

<#
	Using this script,
	you can convert HTML in the clipboard (ex. text copied from Slack)
	into plain text with preserved list formatting.
#>

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

$QUOT = ''
$INDENT = '  '
$MARKER = '- '

$elems = @{
	alone  = @('br', 'img', 'hr')
	inline = @('a', 'span', 'strong', 'em', 'b', 'i', 'code')
	block = @('div', 'p', 'section', 'article', 'blockquote')
	list = @('ul', 'ol')
	item = @('li')
}

function Convert-HtmlToText {
	param(
		[string]$in_html
	)
	$converted = ''
	$indentLevel = 0
	$itemOpened = $false
	$fragmentArr = [regex]::Matches($in_html, '(?s)<\w+\s*/?>|</\w+>|[^<]+')
	foreach ($fragment in $fragmentArr) {
		if ($fragment.Value -match '^<(\w+)\b') {
			$tag = $matches[1].ToLower()
			if ($elems.alone -contains $tag) {
				$converted += "`n"
				continue
			}
			if ($elems.inline -contains $tag) {
				$converted += $QUOT
			} elseif ($elems.list -contains $tag) {
				if ($itemOpened) {
					$converted += "`n"
					$itemOpened = $false
				}
				$indentLevel++
			} elseif ($elems.item -contains $tag) {
				if ($itemOpened) {
					$converted += "`n"
				}
				$converted += (($INDENT * ($indentLevel - 1)) + $MARKER)
				$itemOpened = $true
			}
			continue
		}
		if ($fragment.Value -match '^</(\w+)>') {
			$tag = $matches[1].ToLower()
			if ($elems.inline -contains $tag) {
				$converted += $QUOT
			} elseif ($elems.item -contains $tag) {
				if ($itemOpened) {
					$converted += "`n"
					$itemOpened = $false
				}
			} elseif ($elems.list -contains $tag) {
				if ($itemOpened) {
					$converted += "`n"
					$itemOpened = $false
				}
				$indentLevel--
				$converted += "`n"
			} elseif ($elems.block -contains $tag) {
				$converted += "`n"
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

$raw = [System.Text.Encoding]::UTF8.GetString($bytes)

$FRAGMENT_S = '<!--StartFragment-->'
$FRAGMENT_E = '<!--EndFragment-->'

$s = $raw.IndexOf($FRAGMENT_S) + $FRAGMENT_S.Length
$e = $raw.IndexOf($FRAGMENT_E)
$raw = $raw.Substring($s, $e - $s)

# 1. remove attribute
$html = [regex]::Replace($raw, '<(\w+)(\s+[^>]+)>', '<$1>')

# 2. convert to text
$text = Convert-HtmlToText $html

# 3. extract links
$links = [regex]::Matches($raw, '(?i)<a\s+[^>]*href\s*=\s*"(.*?)"', 'Singleline') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique

if ($links.Count -gt 0) {
	$text += "`n`nlink :`n"
	$text += ($links -join "`n")
}

Set-Clipboard -Value $text
