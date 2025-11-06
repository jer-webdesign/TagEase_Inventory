# RFID Asset Tracking - Quick Reference

## 🚀 Getting Started on Laptop

```bash
# 1. Setup
mkdir rfid_tracker && cd rfid_tracker
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install Flask Flask-CORS python-dotenv

# 2. Ensure MOCK_MODE=True in .env
echo "MOCK_MODE=True" >> .env

# 3. Run server
python app.py

# 4. Run tests (in another terminal)
python test_mock_api.py
```

## 📁 File Structure Quick View

```
rfid_tracker/
├── app.py                          # Start here
├── config.py                       # Configuration
├── .env                           # MOCK_MODE=True for laptop
├── requirements.txt
├── app/
│   ├── __init__.py               # App factory
│   ├── models.py                 # Data models
│   ├── routes/
│   │   ├── api.py               # Main API endpoints
│   │   ├── config.py            # Configuration endpoints
│   │   ├── system.py            # System control
│   │   └── test.py              # 🧪 Test endpoints (mock only)
│   ├── services/
│   │   ├── tracking_service.py  # Data management
│   │   ├── sensor_service_mock.py  # 🧪 Mock sensors
│   │   └── rfid_service_mock.py    # 🧪 Mock RFID
│   └── utils/
│       └── helpers.py           # Utilities
└── data/
    └── tag_tracking.json        # Auto-created
```

## 🎯 Key API Endpoints

### Production Endpoints (Always Available)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status |
| `/api/health` | GET | Health check |
| `/api/records` | GET | All records (supports filters) |
| `/api/records` | POST | Add manual record |
| `/api/records/<tag>` | GET | Get specific tag records |
| `/api/statistics` | GET | Tracking statistics |
| `/api/config/rfid-power` | POST | Set RFID power |
| `/api/config/sensor-range` | POST | Set sensor range |

### Test Endpoints (Mock Mode Only) 🧪

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test/simulate-movement` | POST | Simulate asset movement |
| `/api/test/trigger-sensor` | POST | Trigger specific sensor |
| `/api/test/trigger-rfid` | POST | Trigger RFID read |
| `/api/test/sample-tags` | GET | Get sample tags |
| `/api/test/scenarios` | GET | Test scenarios list |

## 💻 Common Commands

### Testing on Laptop

```bash
# Simulate asset moving IN
curl -X POST http://localhost:5000/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "IN"}'

# Simulate asset moving OUT
curl -X POST http://localhost:5000/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "OUT"}'

# Simulate specific asset
curl -X POST http://localhost:5000/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "IN", "tag_id": "E200001234567890ABCD5678"}'

# Get all records
curl http://localhost:5000/api/records

# Get statistics
curl http://localhost:5000/api/statistics

# Get records for specific tag
curl http://localhost:5000/api/records/E200001234567890ABCD5678
```

### Deploying to Raspberry Pi

```bash
# 1. On laptop - package files
tar -czf rfid_tracker.tar.gz rfid_tracker/

# 2. Transfer to Pi
scp rfid_tracker.tar.gz pi@raspberrypi.local:~/

# 3. On Pi - extract and setup
ssh pi@raspberrypi.local
tar -xzf rfid_tracker.tar.gz
cd rfid_tracker

# 4. Change to hardware mode
nano .env  # Set MOCK_MODE=False

# 5. Install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 6. Set USB permissions
sudo usermod -a -G dialout $USER
sudo reboot

# 7. Test run
python app.py

# 8. Setup as service
sudo cp rfid-tracker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rfid-tracker
sudo systemctl start rfid-tracker
```

## 🔧 Configuration

### .env for Laptop Testing
```bash
MOCK_MODE=True
FLASK_DEBUG=True
```

### .env for Raspberry Pi
```bash
MOCK_MODE=False
RFID_PORT=/dev/ttyUSB0
SENSOR_INSIDE_PORT=/dev/ttyUSB1
SENSOR_OUTSIDE_PORT=/dev/ttyUSB2
```

## 📊 Sample Data

### Sample RFID Tags (Mock Mode)
- `E200001234567890ABCD1234`
- `E200001234567890ABCD5678`
- `E200001234567890ABCD9012`

### Sample Record Format
```json
{
  "rfid_tag": "E200001234567890ABCD5678",
  "direction": "IN",
  "read_date": "2025-10-26-14-30-45-123"
}
```

### Statistics Response
```json
{
  "total_records": 50,
  "in_count": 30,
  "out_count": 20,
  "unique_tags": 10,
  "current_balance": 10,
  "top_tags": [
  {"tag": "E200001234567890ABCD5678", "count": 12},
    {"tag": "TABLE_005", "count": 8}
  ]
}
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check port 5000 is free: `lsof -i :5000` |
| Module not found | Activate venv: `source venv/bin/activate` |
| Test endpoints not working | Verify `MOCK_MODE=True` in `.env` |
| No records saved | Check `data/` directory exists |
| Can't connect to server | Check server is running: `curl http://localhost:5000/api/health` |

## 🔄 Switching Between Modes

### Laptop → Raspberry Pi

1. Change `.env`: `MOCK_MODE=False`
2. Replace mock services with real hardware services
3. Configure USB ports
4. Install `pyserial`
5. Set permissions

### Raspberry Pi → Laptop

1. Change `.env`: `MOCK_MODE=True`
2. Remove hardware requirements
3. No USB configuration needed

## 📝 Testing Checklist

**Before migrating to Pi:**
- [ ] Server starts successfully
- [ ] Can simulate movements
- [ ] Records saved correctly
- [ ] Statistics calculate properly
- [ ] Can filter and query
- [ ] Configuration changes work
- [ ] Multiple movements tracked
- [ ] Data persists after restart

## 🎓 Learning Path

1. **Start**: Run on laptop with mock mode
2. **Test**: Use test endpoints to simulate scenarios
3. **Verify**: Check records and statistics
4. **Understand**: Review how direction logic works
5. **Deploy**: Move to Raspberry Pi with real hardware
6. **Monitor**: Check logs and verify tracking

## 💡 Pro Tips

- Keep browser tab open: `http://localhost:5000/api/records`
- Use JSON formatter extension for better readability
- Test edge cases: same asset IN/OUT multiple times
- Clear data between test runs: `rm data/tag_tracking.json`
- Check server logs for debug information

## 📞 Quick Help

**Server not responding?**
```bash
# Check if running
curl http://localhost:5000/api/health

# Check process
ps aux | grep python

# Restart server
# Ctrl+C then python app.py
```

**Need to reset everything?**
```bash
# Stop server (Ctrl+C)
rm data/tag_tracking.json
python app.py
```

**Check current inventory balance?**
```bash
curl -s http://localhost:5000/api/statistics | python3 -m json.tool
```