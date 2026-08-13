@echo off
set PORT=3001
cd /d C:\opencode\family-menu
C:\taskA\nodejs\node.exe server.js >> C:\opencode\family-menu\family-menu-3001.log 2>> C:\opencode\family-menu\family-menu-3001.err.log
