#!/bin/bash
cd "$(dirname "$0")"
echo "Starting TaskBoard server..."
echo "Open http://localhost:8000 in Chrome or Edge"
echo "Press Ctrl+C to stop the server."
python3 -m http.server 8000
