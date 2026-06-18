' Double-click this file to start TaskBoard:
' starts a local server in the background and opens the app in the browser.
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("WScript.Shell")
' Start the local server hidden (window style 0 = hidden, false = don't wait)
shell.CurrentDirectory = folder
shell.Run "cmd /c python -m http.server 8000", 0, False

' Give the server a moment to start, then open the browser
WScript.Sleep 800
shell.Run "http://localhost:8000"
