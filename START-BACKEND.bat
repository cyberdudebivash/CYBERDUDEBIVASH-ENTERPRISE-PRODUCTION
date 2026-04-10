@echo off
echo.
echo  CYBERDUDEBIVASH(R) Backend Startup
echo  ===================================
echo.
cd /d "%~dp0backend"
if not exist ".env" (
  echo  [!] .env not found. Copying from .env.example...
  copy .env.example .env
  echo  [!] EDIT backend\.env with your real keys before continuing!
  pause
)
echo  [*] Starting server...
node server.js
pause
