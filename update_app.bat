@echo off
REM Quick update script - Transfer only app.py to Raspberry Pi
REM Usage: update_app.bat <raspberry_pi_ip>

if "%~1"=="" (
    echo Error: Raspberry Pi IP address is required
    echo Usage: update_app.bat ^<raspberry_pi_ip^>
    echo Example: update_app.bat 192.168.182.23
    exit /b 1
)

set PI_IP=%~1
set PI_USER=pi

echo ========================================
echo Quick Update - app.py only
echo ========================================
echo.
echo Transferring app.py to %PI_USER%@%PI_IP%...

scp "C:\TagEase_Inventory_V93\rfid_tracker\app.py" "%PI_USER%@%PI_IP%:/home/%PI_USER%/rfid_tracker/"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Transfer successful!
    echo.
    echo Now restart the service on the Pi:
    echo   ssh %PI_USER%@%PI_IP%
    echo   sudo systemctl restart rfid-tracker.service
    echo   journalctl -f -u rfid-tracker.service
) else (
    echo.
    echo ✗ Transfer failed!
    echo Check your connection and try again.
)

echo.
pause
