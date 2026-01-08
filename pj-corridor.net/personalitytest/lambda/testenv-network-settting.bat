@powershell "$THISFILE=\"%~f0\"; $PSCODE=[scriptblock]::Create((Get-Content $THISFILE | Where-Object {$_.ReadCount -gt 1}) -join \"`n\"); & $PSCODE %*" & goto :eof

param(
    [switch]$Rollback
)

$ruleArr = @(
	@{
		DisplayName = 'Block inbound TCP 5000'
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
		DisplayName = 'Block HTTP(S) from non-local'
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
			Remove-NetFirewallRule -DisplayName $name
			Write-Host "Removed rule : ${name}"
		} else {
			Write-Host "Rule not found (skip) : ${name}"
		}
	} else {
		if (-not $exists) {
			New-NetFirewallRule @rule
			Write-Host "Added rule : ${name}"
		} else {
			Write-Host "Rule already exists : ${name}"
		}
	}
}

Read-Host 'Press Enter to close'
