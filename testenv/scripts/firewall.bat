@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::Create((Get-Content $THISFILE | Where-Object {$_.ReadCount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto :eof

param(
	[switch]$Rollback
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$IsAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
	Start-Process powershell -ArgumentList @('-ExecutionPolicy', 'Bypass', '-File', $THISFILE) -Verb RunAs
	exit
}

$ruleArr = @(
	@{
		DisplayName = 'Allow inbound TCP 5000 from localhost'
		Action = 'Allow'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = 5000
		RemoteAddress = '127.0.0.1'
	},
	@{
		DisplayName = 'Block inbound TCP 5000 from non-localhost'
		Action = 'Block'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = 5000
	},
	@{
		DisplayName = 'Allow HTTP(S) from localhost'
		Action = 'Allow'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = @(80, 443)
		RemoteAddress = '127.0.0.1'
	},
	@{
		DisplayName = 'Block HTTP(S) from non-localhost'
		Action = 'Block'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = @(80, 443)
	}
)

foreach ($rule in $ruleArr) {
	$name = $rule.DisplayName
	$exists = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
	if ($Rollback) {
		if ($exists) {
			Remove-NetFirewallRule -DisplayName $name -Confirm:$false
			Write-Host "Removed rule : ${name}"
		} else {
			Write-Host "Rule not found (skip) : ${name}"
		}
	} else {
		if (-not $exists) {
			New-NetFirewallRule @rule | Out-Null
			Write-Host "Added rule : ${name}"
		} else {
			Write-Host "Rule already exists : ${name}"
		}
	}
}

Read-Host 'Press Enter to close'
