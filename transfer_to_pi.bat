@echo off
REM ========================================
REM RFID Tracker - Transfer to Raspberry Pi (Batch Wrapper)
REM ========================================
REM This batch file allows you to run the PowerShell transfer script
REM from Windows Command Prompt (cmd.exe)
REM
REM Usage: transfer_to_pi.bat <raspberry_pi_ip>
REM Example: transfer_to_pi.bat 192.168.1.100

if "%~1"=="" (
    echo Error: Raspberry Pi IP address is required
    echo Usage: transfer_to_pi.bat ^<raspberry_pi_ip^>
    echo Example: transfer_to_pi.bat 192.168.1.100
    exit /b 1
)

echo Running PowerShell transfer script...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0transfer_to_pi.ps1" -PiIP "%~1"

echo.
pause
