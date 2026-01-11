@echo off

REM *** check if you are an administrator ***

net session >nul 2>&1
if errorlevel 1 (
	powershell -command "Start-Process '%~f0' -Verb RunAs"
	exit /b
)

REM *** edit hosts as administrator ***

set "EDITOR=C:\_PATH_\_TO_\_EDITOR_.exe"
set "HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts"

powershell -command "Start-Process '%EDITOR%' -ArgumentList '%HOSTS_FILE%'"
