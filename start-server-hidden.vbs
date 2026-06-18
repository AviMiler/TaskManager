' Runs the TaskBoard local server hidden in the background (no browser window).
' Used by the auto-start (login) shortcut - install with install-autostart-windows.bat
Set shell = CreateObject("WScript.Shell")
folder = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
shell.Run "cmd /c python -m http.server 8000", 0, False
