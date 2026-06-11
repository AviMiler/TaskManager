#!/bin/bash
# Double-click this file (Mac) to start TaskBoard:
# starts a local server in the background and opens the app in the browser.
cd "$(dirname "$0")"

# Start the server in the background if it's not already running
if ! curl -s "http://localhost:8000" > /dev/null 2>&1; then
    nohup python3 -m http.server 8000 > /dev/null 2>&1 &
    sleep 1
fi

open "http://localhost:8000"
