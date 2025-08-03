@powershell "$THISFILE='%~f0'; $PSCODE=[scriptblock]::create((Get-Content $THISFILE | Where-Object {$_.readcount -gt 1}) -join [Environment]::NewLine); & $PSCODE %*" & goto:eof

param (
	[int]$offsetMonth = 0
)

if ($args.Count -gt 0 -and ($args[0] -match '^\d+$')) {
	$offsetMonth = [int]$args[0]
}

$calendarDate = (Get-Date).AddMonths($offsetMonth)
$Y = $calendarDate.Year
$M = $calendarDate.Month
$D_1 = Get-Date -Year $Y -Month $M -Day 1
$D_E = $D_1.AddMonths(1).AddDays(-1)
$W_1 = [int]$D_1.DayOfWeek

$calendar = @()

$calendar += "<table><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>"

$day = 0

while ($day -le $D_E.Day) {
	$line = "<tr>"
	for ($i = 0; $i -lt 7; $i++) {
		if ($day -gt 0) {
			if ($day -le $D_E.Day) {
				$line += "<td>$day</td>"
				$day++
			} else {
				# next month
				$line += "<td>$($D_1.AddDays($i - 1).Day)</td>"
			}
		} else {
			if ($i -lt $W_1) {
				# prev month
				$line += "<td>$($D_1.AddDays($i - $W_1 + 1).Day)</td>"
			} else {
				# start
				$day = 1
				$line += "<td>$day</td>"
				$day++
			}
		}
	}
	$line += "</tr>"
	$calendar += $line
}

$calendar += "</table>"

$FRAGMENT_S = "<!-- start of fragment -->"
$FRAGMENT_E = "<!-- end of fragment -->"

$HTML = @"
<html>
<body>
$FRAGMENT_S
$($calendar -join "`r`n")
$FRAGMENT_E
</body>
</html>
"@

$START = 97

$HEADER = @"
Version:0.9
StartHTML:$("{0:d8}" -f $START)
EndHTML:$("{0:d8}" -f ($START + ($HTML.Length)))
StartFragment:$("{0:d8}" -f ($START + $HTML.IndexOf($FRAGMENT_S)))
EndFragment:$("{0:d8}" -f ($START + $HTML.IndexOf($FRAGMENT_E) + $FRAGMENT_E.Length))
"@

Add-Type -AssemblyName System.Windows.Forms
[Windows.Forms.Clipboard]::SetText(($HEADER + $HTML), 'Html')
