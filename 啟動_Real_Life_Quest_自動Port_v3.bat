@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

title Real Life Quest - Auto Port Launcher v3
cd /d "%~dp0"

echo.
echo ============================================================
echo   Real Life Quest - Auto Port Launcher v3
echo ============================================================
echo.
echo Project folder:
echo   %CD%
echo.

if not exist "index.html" (
    echo [ERROR] index.html was not found.
    echo.
    echo Put this BAT file in the project root,
    echo in the same folder as index.html.
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------
REM Automatically find a free port from 4173 to 4299.
REM Occupied ports are skipped; existing services are never reused.
REM ------------------------------------------------------------
set "PORT="

for /L %%P in (4173,1,4299) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=%%P; $l=$null; try { $l=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$p); $l.Start(); $l.Stop(); exit 0 } catch { if($l){try{$l.Stop()}catch{}}; exit 1 }" >nul 2>nul
    if !ERRORLEVEL! EQU 0 (
        set "PORT=%%P"
        goto :PORT_FOUND
    )
)

echo [ERROR] No free port was found from 4173 to 4299.
echo.
pause
exit /b 1


:PORT_FOUND
set "URL=http://127.0.0.1:%PORT%/"

echo [OK] Free port found: %PORT%
echo [OK] URL: %URL%
echo.

REM ------------------------------------------------------------
REM Prefer Node.js. Fall back to Python.
REM ------------------------------------------------------------
where node >nul 2>nul
if "%ERRORLEVEL%"=="0" goto :NODE_SERVER

where py >nul 2>nul
if "%ERRORLEVEL%"=="0" goto :PY_SERVER

where python >nul 2>nul
if "%ERRORLEVEL%"=="0" goto :PYTHON_SERVER

echo [ERROR] Node.js and Python were not found.
echo Install Node.js or Python and try again.
echo.
pause
exit /b 1


:NODE_SERVER
echo [OK] Node.js detected.
echo [INFO] Starting Real Life Quest on port %PORT%...
echo [INFO] Keep this window open. Press Ctrl+C to stop.
echo.

set "TMP_SERVER=%TEMP%\rlq_static_server_%RANDOM%_%RANDOM%.js"

REM Decode an embedded Node.js static server.
REM Base64 avoids PowerShell here-string / quote parsing problems.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b='Y29uc3QgaHR0cCA9IHJlcXVpcmUoImh0dHAiKTsKY29uc3QgZnMgPSByZXF1aXJlKCJmcyIpOwpjb25zdCBwYXRoID0gcmVxdWlyZSgicGF0aCIpOwoKY29uc3Qgcm9vdCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmFyZ3ZbMl0pOwpjb25zdCBwb3J0ID0gTnVtYmVyKHByb2Nlc3MuYXJndlszXSB8fCA0MTczKTsKCmNvbnN0IG1pbWUgPSB7CiAgIi5odG1sIjogInRleHQvaHRtbDsgY2hhcnNldD11dGYtOCIsCiAgIi5qcyI6ICJ0ZXh0L2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLTgiLAogICIubWpzIjogInRleHQvamF2YXNjcmlwdDsgY2hhcnNldD11dGYtOCIsCiAgIi5jc3MiOiAidGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgiLAogICIuanNvbiI6ICJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04IiwKICAiLndlYm1hbmlmZXN0IjogImFwcGxpY2F0aW9uL21hbmlmZXN0K2pzb247IGNoYXJzZXQ9dXRmLTgiLAogICIucG5nIjogImltYWdlL3BuZyIsCiAgIi5qcGciOiAiaW1hZ2UvanBlZyIsCiAgIi5qcGVnIjogImltYWdlL2pwZWciLAogICIud2VicCI6ICJpbWFnZS93ZWJwIiwKICAiLnN2ZyI6ICJpbWFnZS9zdmcreG1sOyBjaGFyc2V0PXV0Zi04IiwKICAiLmljbyI6ICJpbWFnZS94LWljb24iLAogICIud29mZiI6ICJmb250L3dvZmYiLAogICIud29mZjIiOiAiZm9udC93b2ZmMiIsCiAgIi5tcDMiOiAiYXVkaW8vbXBlZyIsCiAgIi53YXYiOiAiYXVkaW8vd2F2Igp9OwoKZnVuY3Rpb24gcmVzb2x2ZUZpbGUodXJsUGF0aCkgewogIGxldCBjbGVhbjsKICB0cnkgewogICAgY2xlYW4gPSBkZWNvZGVVUklDb21wb25lbnQoKHVybFBhdGggfHwgIi8iKS5zcGxpdCgiPyIpWzBdKTsKICB9IGNhdGNoIHsKICAgIHJldHVybiBudWxsOwogIH0KCiAgY29uc3QgcmVsID0gY2xlYW4gPT09ICIvIiA/ICJpbmRleC5odG1sIiA6IGNsZWFuLnJlcGxhY2UoL15cLysvLCAiIik7CiAgY29uc3QgZnVsbCA9IHBhdGgucmVzb2x2ZShyb290LCByZWwpOwoKICBpZiAoZnVsbCAhPT0gcm9vdCAmJiAhZnVsbC5zdGFydHNXaXRoKHJvb3QgKyBwYXRoLnNlcCkpIHsKICAgIHJldHVybiBudWxsOwogIH0KICByZXR1cm4gZnVsbDsKfQoKY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7CiAgbGV0IGZpbGUgPSByZXNvbHZlRmlsZShyZXEudXJsKTsKCiAgaWYgKCFmaWxlKSB7CiAgICByZXMud3JpdGVIZWFkKDQwMywgeyJDb250ZW50LVR5cGUiOiAidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOCJ9KTsKICAgIHJlcy5lbmQoIkZvcmJpZGRlbiIpOwogICAgcmV0dXJuOwogIH0KCiAgdHJ5IHsKICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUpICYmIGZzLnN0YXRTeW5jKGZpbGUpLmlzRGlyZWN0b3J5KCkpIHsKICAgICAgZmlsZSA9IHBhdGguam9pbihmaWxlLCAiaW5kZXguaHRtbCIpOwogICAgfQogIH0gY2F0Y2gge30KCiAgZnMucmVhZEZpbGUoZmlsZSwgKGVyciwgZGF0YSkgPT4gewogICAgaWYgKGVycikgewogICAgICBjb25zdCBzdGF0dXMgPSBlcnIuY29kZSA9PT0gIkVOT0VOVCIgPyA0MDQgOiA1MDA7CiAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzLCB7IkNvbnRlbnQtVHlwZSI6ICJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04In0pOwogICAgICByZXMuZW5kKHN0YXR1cyA9PT0gNDA0ID8gIjQwNCBOb3QgRm91bmQiIDogIjUwMCBTZXJ2ZXIgRXJyb3IiKTsKICAgICAgcmV0dXJuOwogICAgfQoKICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlKS50b0xvd2VyQ2FzZSgpOwogICAgcmVzLndyaXRlSGVhZCgyMDAsIHsKICAgICAgIkNvbnRlbnQtVHlwZSI6IG1pbWVbZXh0XSB8fCAiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtIiwKICAgICAgIkNhY2hlLUNvbnRyb2wiOiAibm8tY2FjaGUiCiAgICB9KTsKICAgIHJlcy5lbmQoZGF0YSk7CiAgfSk7Cn0pOwoKc2VydmVyLm9uKCJlcnJvciIsIChlcnIpID0+IHsKICBjb25zb2xlLmVycm9yKCJbRVJST1JdIFNlcnZlciBmYWlsZWQ6IiwgZXJyLm1lc3NhZ2UpOwogIHByb2Nlc3MuZXhpdCgxKTsKfSk7CgpzZXJ2ZXIubGlzdGVuKHBvcnQsICIxMjcuMC4wLjEiLCAoKSA9PiB7CiAgY29uc29sZS5sb2coIiIpOwogIGNvbnNvbGUubG9nKCI9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0iKTsKICBjb25zb2xlLmxvZygiIFJlYWwgTGlmZSBRdWVzdCBpcyBydW5uaW5nIik7CiAgY29uc29sZS5sb2coIiBVUkw6IGh0dHA6Ly8xMjcuMC4wLjE6IiArIHBvcnQgKyAiLyIpOwogIGNvbnNvbGUubG9nKCIgUHJlc3MgQ3RybCtDIHRvIHN0b3AiKTsKICBjb25zb2xlLmxvZygiPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Iik7CiAgY29uc29sZS5sb2coIiIpOwp9KTsK'; [IO.File]::WriteAllBytes('%TMP_SERVER%',[Convert]::FromBase64String($b))"

if not exist "%TMP_SERVER%" (
    echo [ERROR] Failed to create the temporary Node.js server.
    echo.
    pause
    exit /b 1
)

REM Open the browser shortly after Node starts.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 800; Start-Process '%URL%'" >nul 2>nul

node "%TMP_SERVER%" "%CD%" "%PORT%"

set "NODE_EXIT=%ERRORLEVEL%"
del "%TMP_SERVER%" >nul 2>nul

if not "%NODE_EXIT%"=="0" (
    echo.
    echo [ERROR] The local server stopped with exit code %NODE_EXIT%.
    pause
)
exit /b %NODE_EXIT%


:PY_SERVER
echo [OK] Python launcher detected.
echo [INFO] Starting Real Life Quest on port %PORT%...
echo [INFO] Keep this window open. Press Ctrl+C to stop.
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 800; Start-Process '%URL%'" >nul 2>nul
py -m http.server %PORT% --bind 127.0.0.1
exit /b %ERRORLEVEL%


:PYTHON_SERVER
echo [OK] Python detected.
echo [INFO] Starting Real Life Quest on port %PORT%...
echo [INFO] Keep this window open. Press Ctrl+C to stop.
echo.

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 800; Start-Process '%URL%'" >nul 2>nul
python -m http.server %PORT% --bind 127.0.0.1
exit /b %ERRORLEVEL%
