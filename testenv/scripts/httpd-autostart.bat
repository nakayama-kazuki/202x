@echo off

REM *** Using this script, you can register httpd.exe as a service, and restart httpd.exe.
REM *** Change "APACHE_HOME=C:\_PATH_\_TO_\_APACHE_" to match your environment.

REM *** check if you are an administrator

net session >nul 2>&1
if errorlevel 1 (
	powershell -command "Start-Process '%~f0' -Verb RunAs"
	exit /b
)

REM *** register httpd.exe as a service / restart

set "APACHE_HOME=C:\_PATH_\_TO_\_APACHE_"
set "APACHE_BIN=%APACHE_HOME%\bin"
set "SERVICE_NAME=Apache2.4"

cd /d "%APACHE_BIN%"

REM --- Check if service exists ---
sc query "%SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
	REM Service not installed
	httpd.exe -k install
	sc config "%SERVICE_NAME%" start= auto
	net start "%SERVICE_NAME%"
	goto :eof
)

REM --- Check service state ---
for /f "tokens=3" %%S in ('sc query "%SERVICE_NAME%" ^| findstr STATE') do (
	set STATE=%%S
)

REM --- Act based on state ---
if "%STATE%"=="RUNNING" (
	net stop "%SERVICE_NAME%"
	net start "%SERVICE_NAME%"
) else (
	net start "%SERVICE_NAME%"
)
