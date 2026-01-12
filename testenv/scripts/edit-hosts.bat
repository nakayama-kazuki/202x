@echo off

REM *** Using this script, you can edit hosts as an administrator.
REM *** Change "EDITOR=C:\_PATH_\_TO_\_EDITOR_" to match your environment.
REM *** Change "HOSTSF=C:\_PATH_\_TO_\_HOSTS_" to match your environment.

REM *** check if you are an administrator

net session >nul 2>&1
if errorlevel 1 (
	powershell -command "Start-Process '%~f0' -Verb RunAs"
	exit /b
)

REM *** edit hosts as administrator

set "EDITOR=C:\_PATH_\_TO_\_EDITOR_"
set "HOSTSF=C:\_PATH_\_TO_\_HOSTS_"

powershell -command "Start-Process '%EDITOR%' -ArgumentList '%HOSTSF%'"
