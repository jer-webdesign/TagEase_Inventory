@echo off
REM Check RFID Tracker Service Status
REM Usage: check_service.bat <raspberry_pi_ip>

if "%~1"=="" (
    set PI_IP=192.168.182.23
) else (
    set PI_IP=%~1
)

set PI_USER=raspberry

echo ========================================
echo Checking RFID Tracker Service Status
echo ========================================
echo.
echo Connecting to %PI_USER%@%PI_IP%...
echo.

ssh %PI_USER%@%PI_IP% "sudo systemctl status rfid-tracker.service"

echo.
echo ========================================
echo.
echo To view live logs, run:
echo   ssh %PI_USER%@%PI_IP%
echo   journalctl -f -u rfid-tracker.service
echo.
pause
