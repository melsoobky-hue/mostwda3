@echo off
echo ========================================
echo   Mirrors Dashboard - Starting...
echo ========================================
echo.

:: Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Building client...
cd /d "%~dp0client"
call npx vite build
if %errorlevel% neq 0 (
    echo [ERROR] Client build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Starting server...
cd /d "%~dp0server"
echo.
echo ========================================
echo   Dashboard is running at:
echo   http://localhost:3001
echo ========================================
echo.
echo Press Ctrl+C to stop the server.
echo.
node src/index.js
