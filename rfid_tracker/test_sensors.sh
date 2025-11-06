#!/bin/bash
# Test sensors only (no RFID required)

echo "Starting sensor detection test..."
cd /home/raspberry/rfid_tracker
python3 test_sensors_only.py
