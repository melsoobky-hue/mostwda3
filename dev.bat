@echo off
echo ========================================
echo   Mirrors Dashboard - Dev Mode
echo ========================================
echo.
echo Starting server and client in dev mode...
echo.

:: Start server in background
echo [1/2] Starting API server on port 3001...
cd /d "%~dp0server"
start "Mirrors API" node src/index.js

:: Start client dev server
echo [2/2] Starting Vite dev server on port 5173...
cd /d "%~dp0client"
call npx vite --host

echo.
echo ========================================
echo   Server:  http://localhost:3001
echo   Client:  http://localhost:5173
echo ========================================
