@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::Create((Get-Content $THISFILE | Where-Object {$_.ReadCount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto :eof

<#
	Using this script, you can apply / remove firewall settings.

	> firewall.bat
		apply "DisplayName" rules :
			localhost --[o]--> TCP 80/443/5000 localhost
			otherhost --[x]--> TCP 80/443/5000 localhost

	> firewall.bat -Rollback
		remove "DisplayName" rules
#>

param(
	[switch]$Rollback
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$IsAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
	Write-Host 'this script must be run as administrator.' -ForegroundColor Red
	exit
}

$ruleArr = @(
	@{
		DisplayName = 'Block inbound TCP 5000 from non-localhost'
		Action = 'Block'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = 5000
		RemoteAddress = 'Any'
	},
	@{
		DisplayName = 'Allow inbound TCP 5000 from localhost'
		Action = 'Allow'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = 5000
		RemoteAddress = '127.0.0.1'
	},
	@{
		DisplayName = 'Block HTTP(S) from non-localhost'
		Action = 'Block'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = @(80, 443)
		RemoteAddress = 'Any'
	},
	@{
		DisplayName = 'Allow HTTP(S) from localhost'
		Action = 'Allow'
		Direction = 'Inbound'
		Protocol = 'TCP'
		LocalPort = @(80, 443)
		RemoteAddress = '127.0.0.1'
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
			Write-Host "Rule not found (skip) : ${name}" -ForegroundColor Red
		}
	} else {
		if (-not $exists) {
			New-NetFirewallRule @rule | Out-Null
			Write-Host "Added rule : ${name}"
		} else {
			Write-Host "Rule already exists : ${name}" -ForegroundColor Red
		}
	}
}

Read-Host 'Press Enter to close'
