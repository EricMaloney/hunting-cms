@echo off
setlocal EnableDelayedExpansion
title Huntington CMS Worker Setup

echo.
echo ============================================================
echo   Huntington Steel CMS Worker - Windows Setup
echo ============================================================
echo.

:: ── 1. Check for Node.js ────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please download and install the LTS version from:
    echo   https://nodejs.org
    echo.
    echo Then re-run this script.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% found.

:: ── 2. Download / update project files ──────────────────────────────────────
set INSTALL_DIR=C:\huntington-worker

if exist "%INSTALL_DIR%\.git" (
    echo.
    echo [INFO] Worker folder already exists. Pulling latest code...
    cd /d "%INSTALL_DIR%"
    git pull
) else (
    echo.
    echo [INFO] Downloading worker files from GitHub...

    :: Use PowerShell to download the zip (no git required)
    powershell -NoProfile -Command ^
        "Invoke-WebRequest -Uri 'https://github.com/EricMaloney/hunting-cms/archive/refs/heads/main.zip' -OutFile '%TEMP%\hunting-cms.zip' -UseBasicParsing"

    if %errorlevel% neq 0 (
        echo [ERROR] Download failed. Check your internet connection.
        pause
        exit /b 1
    )

    echo [INFO] Extracting...
    powershell -NoProfile -Command ^
        "Expand-Archive -Path '%TEMP%\hunting-cms.zip' -DestinationPath '%TEMP%\hunting-cms-extract' -Force; ^
         Move-Item '%TEMP%\hunting-cms-extract\hunting-cms-main' '%INSTALL_DIR%' -Force"

    del "%TEMP%\hunting-cms.zip"
    echo [OK] Files extracted to %INSTALL_DIR%
)

:: ── 3. Install npm dependencies ──────────────────────────────────────────────
echo.
echo [INFO] Installing npm dependencies (this takes ~1 minute)...
cd /d "%INSTALL_DIR%"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

:: ── 4. Create .env.local ─────────────────────────────────────────────────────
echo.
if exist "%INSTALL_DIR%\.env.local" (
    echo [INFO] .env.local already exists. Skipping credential setup.
    echo        To update credentials, edit: %INSTALL_DIR%\.env.local
) else (
    echo ============================================================
    echo   Enter the credentials for the worker.
    echo   These are stored locally in %INSTALL_DIR%\.env.local
    echo   and are NEVER uploaded anywhere.
    echo ============================================================
    echo.

    set /p SUPABASE_URL=Supabase URL (NEXT_PUBLIC_SUPABASE_URL):
    set /p SUPABASE_KEY=Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY):
    set /p UNIFI_EMAIL=UniFi Email (UNIFI_EMAIL):
    set /p UNIFI_PASS=UniFi Password (UNIFI_PASSWORD):

    (
        echo NEXT_PUBLIC_SUPABASE_URL=!SUPABASE_URL!
        echo SUPABASE_SERVICE_ROLE_KEY=!SUPABASE_KEY!
        echo UNIFI_EMAIL=!UNIFI_EMAIL!
        echo UNIFI_PASSWORD=!UNIFI_PASS!
    ) > "%INSTALL_DIR%\.env.local"

    echo [OK] Credentials saved to .env.local
)

:: ── 5. Quick smoke test ──────────────────────────────────────────────────────
echo.
echo [INFO] Running quick test (should say "Queue empty")...
cd /d "%INSTALL_DIR%"
node --env-file=.env.local node_modules\.bin\tsx scripts\unifi-worker.ts
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Worker test returned an error. Check credentials in .env.local
    echo           Path: %INSTALL_DIR%\.env.local
    pause
)

:: ── 6. Register the scheduled task ──────────────────────────────────────────
echo.
echo ============================================================
echo   Setting up Windows Scheduled Task
echo ============================================================
echo.
echo The task will run every 5 minutes under YOUR network login.
echo Enter your credentials so Windows can run it when you're
echo logged out (Heather's profile active).
echo.
set /p TASK_USER=Your Windows username (e.g. HUNTINGTON\emaloney):
set /p TASK_PASS=Your Windows password:

:: Delete existing task if present
schtasks /delete /tn "Huntington CMS Worker" /f >nul 2>&1

:: Import XML with stored credentials
schtasks /create /xml "%~dp0huntington-task.xml" /tn "Huntington CMS Worker" /ru "!TASK_USER!" /rp "!TASK_PASS!"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Task creation failed.
    echo   - Double-check username format (DOMAIN\username or just username)
    echo   - Make sure your password is correct
    echo   - Try running this script as Administrator
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   SETUP COMPLETE
echo ============================================================
echo.
echo   Worker location : %INSTALL_DIR%
echo   Credentials     : %INSTALL_DIR%\.env.local
echo   Runs every      : 5 minutes (silently, any profile)
echo   Log file        : C:\huntington-worker\worker.log
echo.
echo   You can now log out. The task will continue running
echo   silently under your stored credentials.
echo.
echo   To check it's working: open Task Scheduler and look for
echo   "Huntington CMS Worker" - Last Run Result should be 0x0.
echo.
pause
