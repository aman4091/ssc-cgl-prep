@echo off
title SSC CGL Pre - Prep Hub
color 0b
cd /d "%~dp0"

REM --- Make sure Node.js is available even in a fresh terminal ---
set "PATH=%PATH%;C:\Program Files\nodejs"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [!] Node.js nahi mila. Kripya install karein: https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo ============================================
echo    SSC CGL Pre - Prep Hub
echo    Website start ho rahi hai...
echo ============================================
echo.

REM --- First run: install dependencies if missing ---
if not exist "node_modules" (
  echo [i] Pehli baar chala rahe ho - dependencies install ho rahi hain.
  echo     Isme 1-2 minute lag sakte hain, ek baar hi hoga...
  echo.
  call npm install
  echo.
)

echo [i] Server start ho raha hai... browser apne aap khul jayega.
echo     Band karne ke liye is window ko close kar do.
echo.

REM --- Background helper: server ready hote hi browser khol dega ---
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-browser.ps1"

REM --- Run the dev server (window band karte hi server ruk jayega) ---
call npm run dev

echo.
echo Server ruk gaya. Koi bhi key dabao...
pause >nul
