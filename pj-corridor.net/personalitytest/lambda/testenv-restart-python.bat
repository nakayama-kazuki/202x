@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto:eof

param(
    [string]$pathToApp
)

if (-not $pathToApp) {
    Write-Host 'drag & drop a .py file onto this bat.'
    pause
    exit 1
}

$port = 5000

$lineArr = netstat -ano | Select-String ":${port}\s+.*LISTENING"
foreach ($line in $lineArr) {
    $targetPid = ($line -split '\s+')[-1]
    taskkill /PID $targetPid /F
}

Start-Process python -ArgumentList @("${pathToApp}", '--port', $port) -WorkingDirectory (Split-Path $pathToApp)
