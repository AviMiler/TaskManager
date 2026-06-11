@echo off
cd /d "%~dp0"
echo Starting TaskBoard server...
echo Open http://localhost:8000 in Chrome or Edge
echo Press Ctrl+C to stop the server.
python -m http.server 8000
pause
