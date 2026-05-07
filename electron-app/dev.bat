@echo off
echo ============================================
echo Starting Development Server
echo ============================================

echo.
echo Installing dependencies if needed...
call npm install

echo.
echo Starting dev mode...
call npm run dev
