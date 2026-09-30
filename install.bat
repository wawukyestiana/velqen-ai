@echo off
REM Velqen AI installer - double-click (asks) or: install.bat [-Laragon] [-Portable] [-System]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1" %*
