@echo off
setlocal
echo.
echo ========================================================
echo.
echo   Server laeuft! Browser wird geoeffnet...
echo   (Falls nicht: http://127.0.0.1:8080 )
echo.
echo ========================================================
echo.

start http://127.0.0.1:8080

py -m http.server 8080 >nul 2>nul
if %errorlevel% neq 0 (
  python -m http.server 8080
)
