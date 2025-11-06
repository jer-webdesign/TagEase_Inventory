# RFID Asset Tracking System

Flask-based backend server for tracking assets using RFID tags and mmWave sensors on Raspberry Pi Zero 2W.

## Hardware Components

- **Raspberry Pi Zero 2W** - Main controller
- **M5Stack UHF RFID Reader** - Reads RFID tags
- **2x S3KM1110 mmWave Sensors** - Human motion detection
- **USB Hub** - Connects all devices
- **5V 3A Power Adapter** - Powers the system

## Project Structure

```
rfid_tracker/
├── app.py                      # Application entry point
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
├── README.md                   # This file
├── data/
│   └── tag_tracking.json       # Tracking data (auto-created)
├── app/
│   ├── __init__.py            # Flask app factory
│   ├── models.py              # Data models
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── api.py             # API endpoints
│   │   ├── config.py          # Configuration endpoints
│   │   └── system.py          # System control endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rfid_service.py    # RFID reader service
│   │   ├── sensor_service.py  # mmWave sensor service
│   │   └── tracking_service.py # Tracking logic
│   └── utils/
│       ├── __init__.py
│       └── helpers.py         # Helper functions
└── tests/
    ├── __init__.py
    └── test_api.py            # API tests
```

## Installation

### 1. Clone or Create Project

```bash
mkdir -p ~/rfid_tracker
cd ~/rfid_tracker
```

### 2. Create Directory Structure

```bash
mkdir -p app/routes app/services app/utils tests data
```

### 3. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment

Copy `.env.example` to `.env` and update with your settings:

```bash
cp .env.example .env
nano .env
```

### 6. Set USB Permissions

```bash
sudo usermod -a -G dialout $USER
sudo reboot
```

### 7. Run Application

```bash
python app.py
```

## API Endpoints

### System Status

- `GET /api/status` - Get system status
- `GET /api/health` - Health check

### Tracking Records

- `GET /api/records` - Get all records (supports filters: direction, limit, start_date, end_date)
- `GET /api/records/<tag_id>` - Get records for specific tag
- `POST /api/records` - Manually add record
- `DELETE /api/records?confirm=true` - Clear all records
- `GET /api/statistics` - Get tracking statistics

### Configuration

- `POST /api/config/rfid-power` - Set RFID reader power (10-30 dBm)
- `POST /api/config/sensor-range` - Set sensor detection range (1-10 meters)

### System Control

- `POST /api/system/reboot?confirm=true` - Reboot Raspberry Pi
- `POST /api/system/shutdown?confirm=true` - Shutdown Raspberry Pi

## Usage Examples

### Get System Status

```bash
curl http://localhost:5000/api/status
```

### Get Recent Records

```bash
curl http://localhost:5000/api/records?limit=10
```

### Add Manual Record

```bash
curl -X POST http://localhost:5000/api/records \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "TAG123456", "direction": "IN"}'
```

### Configure RFID Power

```bash
curl -X POST http://localhost:5000/api/config/rfid-power \
  -H "Content-Type: application/json" \
  -d '{"power": 26}'
```

### Get Statistics

```bash
curl http://localhost:5000/api/statistics
```

## Running as Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/rfid-tracker.service
```

Add:

```ini
[Unit]
Description=RFID Asset Tracking Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/rfid_tracker
Environment="PATH=/home/pi/rfid_tracker/venv/bin"
ExecStart=/home/pi/rfid_tracker/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rfid-tracker
sudo systemctl start rfid-tracker
sudo systemctl status rfid-tracker
```

## Testing

Run unit tests:

```bash
python -m unittest tests/test_api.py
```

## Troubleshooting

### Check Service Logs

```bash
sudo journalctl -u rfid-tracker -f
```

### Verify USB Devices

```bash
ls -l /dev/ttyUSB*
```

### Check Permissions

```bash
groups $USER  # Should include 'dialout'
```

## Configuration

### RFID Power Settings

- **10-15 dBm**: Short range (~1-2m)
- **20-26 dBm**: Medium range (~3-5m)
- **27-30 dBm**: Long range (~6-10m)

### Sensor Range

- **Recommended**: 3-5 meters for door frame
- **Maximum**: 10 meters

### Human Detection Timeout

- **Default**: 5 seconds
- Adjust based on walking speed

## License

MIT License

## Support

For issues, check logs and verify USB connections.