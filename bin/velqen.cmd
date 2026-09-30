@echo off
REM velqen short alias for velqen-ai. Same launcher, shorter to type.
set "HERE=%~dp0"
if exist "%HERE%..\tools\node\node.exe" (
  "%HERE%..\tools\node\node.exe" "%HERE%velqen-ai.js" %*
) else (
  node "%HERE%velqen-ai.js" %*
)
exit /b %errorlevel%
