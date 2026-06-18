@echo off
REM Registers the TaskBoard server to start automatically when Windows logs in.
REM Run this once. After that, the server starts hidden in the background on every login.

set "SCRIPT_DIR=%~dp0"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\TaskBoard Server.lnk"

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = '%SCRIPT_DIR%start-server-hidden.vbs';" ^
  "$s.WorkingDirectory = '%SCRIPT_DIR%';" ^
  "$s.Save()"

echo Done. The TaskBoard server will now start automatically on login.
echo To remove it, delete: %SHORTCUT%
pause
