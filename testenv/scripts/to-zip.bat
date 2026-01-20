@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto:eof

<#
	Using this script, you can make zip
#>

param(
	[string]$pathToApp
)

if ($pathToApp) {
	Compress-Archive -Path $pathToApp -DestinationPath "${pathToApp}.zip" -Force
} else {
	Write-Host 'drag & drop a .py file onto this bat.' -ForegroundColor Red
	pause
	exit 1
}

