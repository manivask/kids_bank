@echo off
echo Starting KidsBank App...
cd /d "%~dp0"
start http://127.0.0.1:8085
python server.py
pause

