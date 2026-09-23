@echo off
title MiPhi Sales - Build Android APK
cd /d "%~dp0"

echo ============================================
echo   MiPhi Sales - Android test APK builder
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org , then run this file again.
  pause
  exit /b 1
)

echo Paste the Azure "Application (client) ID" for MiPhi Sales.
echo Leave it blank to build anyway (the app will open, but sign in will not work yet).
set /p CLIENTID=Client ID:
if not "%CLIENTID%"=="" (
  powershell -NoProfile -Command "(Get-Content 'src\config.ts' -Raw) -replace '00000000-0000-0000-0000-000000000000','%CLIENTID%' | Set-Content 'src\config.ts' -NoNewline"
  echo Client ID saved to src\config.ts
)

echo.
echo [1/4] Installing packages (a few minutes the first time)...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/4] Sign in to your free Expo account (create one at https://expo.dev/signup)
call npx --yes eas-cli@latest login
if errorlevel 1 goto :fail

echo.
echo [3/4] Linking the project to your Expo account (answer Y if asked)...
call npx --yes eas-cli@latest init
if errorlevel 1 goto :fail

echo.
echo [4/4] Building the APK in the Expo cloud (10 to 20 minutes).
echo       If asked to generate a new Android keystore, answer Y.
call npx --yes eas-cli@latest build --platform android --profile preview
if errorlevel 1 goto :fail

echo.
echo Done. Open the link or scan the QR code above on your Android phone to install the APK.
pause
exit /b 0

:fail
echo.
echo Something went wrong. Scroll up to see the error message.
pause
exit /b 1
