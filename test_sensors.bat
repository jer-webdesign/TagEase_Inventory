@echo off
REM Test sensors only (no RFID required)

echo Starting sensor detection test...
cd rfid_tracker
python test_sensors_only.py
pause
