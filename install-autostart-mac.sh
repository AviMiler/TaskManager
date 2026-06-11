#!/bin/bash
# Registers the TaskBoard server to start automatically when you log in (Mac).
# Run this once: ./install-autostart-mac.sh
# To remove later: launchctl unload ~/Library/LaunchAgents/com.taskboard.server.plist
#                   rm ~/Library/LaunchAgents/com.taskboard.server.plist

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.taskboard.server.plist"

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.taskboard.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>-m</string>
        <string>http.server</string>
        <string>8000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/taskboard-server.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/taskboard-server.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Done. The TaskBoard server now runs automatically at login (http://localhost:8000)."
echo "To remove it: launchctl unload $PLIST && rm $PLIST"
