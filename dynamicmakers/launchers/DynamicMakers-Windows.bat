@echo off
rem Dynamic Makers launcher (Windows): opens DynamicMakers.html in a Chrome app window.
rem Falls back to Microsoft Edge (also supports USB / Bluetooth), then the default browser.
setlocal
set "HTML=%~dp0DynamicMakers.html"
rem Chrome fixes up spaces / non-ASCII folder names in the quoted URL itself
set "URL=file:///%HTML:\=/%"
set "BROWSER="
for %%B in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if not defined BROWSER if exist %%B set "BROWSER=%%~B"
if defined BROWSER (
  start "" "%BROWSER%" --app="%URL%" --window-size=1366,820
) else (
  echo Chrome or Edge was not found. Opening with the default browser.
  echo USB / Bluetooth need Chrome or Edge.
  start "" "%HTML%"
  timeout /t 5 >nul
)
endlocal
