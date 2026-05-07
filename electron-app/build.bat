@echo off
echo ============================================
echo Building Squeet's Screensaver Utility
echo ============================================

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building application...
call npm run build

echo.
echo Step 3: Creating installer...
call npm run package

echo.
echo ============================================
echo Build complete!
echo Installer is in the release/ folder
echo ============================================
pause
