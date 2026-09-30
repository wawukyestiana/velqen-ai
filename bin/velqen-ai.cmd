@echo off
REM velqen-ai launcher - uses the repo's own tools/node when present, else system node.
set "HERE=%~dp0"
if exist "%HERE%..\tools\node\node.exe" (
  "%HERE%..\tools\node\node.exe" "%HERE%velqen-ai.js" %*
) else (
  node "%HERE%velqen-ai.js" %*
)
exit /b %errorlevel%
