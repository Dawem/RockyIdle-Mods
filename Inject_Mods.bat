@echo off
setlocal enabledelayedexpansion

:: Change working directory to the directory of this script
cd /d "%~dp0"

echo Checking prerequisites...

:: Check Python installation
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [WARNING] Python is not installed or not added to your system PATH.
    set /p "install_python=Would you like to try installing Python automatically via winget? [Y/N]: "
    if /i "!install_python!"=="Y" (
        echo.
        echo Installing Python 3...
        winget install Python.Python.3
        echo.
        echo Please restart this batch script after Python installation completes.
        pause
        exit /b 0
    ) else (
        echo Please install Python manually and try again.
        pause
        exit /b 1
    )
)

:: Check Node.js installation
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [WARNING] Node.js is not installed or not added to your system PATH.
    set /p "install_node=Would you like to try installing Node.js automatically via winget? [Y/N]: "
    if /i "!install_node!"=="Y" (
        echo.
        echo Installing Node.js...
        winget install OpenJS.NodeJS
        echo.
        echo Please restart this batch script after Node.js installation completes.
        pause
        exit /b 0
    ) else (
        echo Please install Node.js manually and try again.
        pause
        exit /b 1
    )
)

:: Check and install local TypeScript compiler to speed up builds (caching node_modules)
if not exist "node_modules\typescript" (
    echo Local TypeScript compiler not found. Installing compilation dependencies...
    call npm install typescript --no-save --no-audit --no-fund
)

echo.
echo Running mod compilation and injection script...
python inject.py

if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Mod injection failed. Please review the errors above.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Mods successfully compiled and injected!
timeout /t 5
