@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto:eof

<#
	Using this script, allows you to zip and unzip files.
#>

param(
	[string]$pathToApp
)

if (-not $pathToApp) {
	Write-Host 'drag & drop a file onto this bat.' -ForegroundColor Red
	pause
	exit 1
}

$ext = [System.IO.Path]::GetExtension($pathToApp)
$dir = [System.IO.Path]::GetDirectoryName($pathToApp)
$base = [System.IO.Path]::GetFileNameWithoutExtension($pathToApp)

if ($ext -eq '.zip') {
	Expand-Archive -Path $pathToApp -DestinationPath $dir -Force
} else {
	Compress-Archive -Path $pathToApp -DestinationPath "${pathToApp}.zip" -Force
}
