@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto:eof

<#
	Using this script, you can launch a python application by dragging file onto it.
	Change '@powershel' to '@powershel -NoExit', you can check error messages.
	Change 'C:\_PATH_\_TO_\httpd.conf' to match your environment.
	If needed, add definition to $PYTHON_ENV for "os.environ".
#>

param(
	[string]$pathToApp
)

$HTTPD_CONF = 'C:\_PATH_\_TO_\httpd.conf'

$PYTHON_ENV = @{
	LAMBDA_SECRET = "qwerty1234"
}

function Start-PythonWithPort {
	param(
		[string]$pathToApp,
		[int]$port
	)
	$lineArr = netstat -ano | Select-String ":${port}\s+.*\s+\d+$"
	foreach ($line in $lineArr) {
		$targetPid = ($line.Line -split '\s+')[-1]
		if ($targetPid -ne '0') {
			taskkill /PID $targetPid /F
		}
	}
	foreach ($key in $PYTHON_ENV.Keys) {
		Set-Item -Path "Env:$key" -Value $PYTHON_ENV[$key]
	}
	Set-Location (Split-Path $pathToApp)
	python $pathToApp --port $port
}

if ($pathToApp) {
	if (Test-Path $HTTPD_CONF) {
		$defineLine = Get-Content $HTTPD_CONF | Where-Object { $_ -match '^\s*Define\s+PORT_PYTHON\s+(\d+)' } | Select-Object -First 1
		if (-not $defineLine) {
			Write-Host "PORT_PYTHON is not defined in ${HTTPD_CONF}" -ForegroundColor Red
			pause
			exit 1
		}
		$port = [int]($defineLine -replace '.*\s+(\d+)$', '$1')
		Write-Host "start ${pathToApp} using ${port}"
		Start-PythonWithPort $pathToApp $port
	} else {
		Write-Host "not found : ${HTTPD_CONF}" -ForegroundColor Red
		pause
		exit 1
	}
} else {
	Write-Host 'drag & drop a .py file onto this bat.' -ForegroundColor Red
	pause
	exit 1
}
