@echo off
REM Pull (download) app.py from Raspberry Pi to Windows
REM Usage: pull_from_pi.bat <raspberry_pi_ip>

if "%~1"=="" (
    set PI_IP=192.168.182.23
) else (
    set PI_IP=%~1
)

set PI_USER=raspberry

echo ========================================
echo Pull app.py from Raspberry Pi
echo ========================================
echo.
echo Downloading from %PI_USER%@%PI_IP%...

scp "%PI_USER%@%PI_IP%:/home/%PI_USER%/rfid_tracker/app.py" "C:\TagEase_Inventory_V93\rfid_tracker\app.py"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Successfully downloaded app.py
    echo Saved to: C:\TagEase_Inventory_V93\rfid_tracker\app.py
) else (
    echo.
    echo Failed to download app.py
)

echo.
pause
