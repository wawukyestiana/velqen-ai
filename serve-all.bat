@echo off
REM Velqen AI one-terminal launcher - serve (background) + Telegram bot (foreground)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve-all.ps1" %*
