# TagEase Inventory — RFID + Sensors

Comprehensive README for the TagEase Inventory project. This repository contains an RFID + mmWave sensor tracking service running on a Raspberry Pi (`rfid_tracker`), a backend admin API (`backend_inventory`), and a React frontend (`frontend_inventory`).

## Table of Contents
- Project overview
- Architecture
- Quick start (Raspberry Pi)
- Local development
- Configuration
- Service management (systemd)
- WebSocket & realtime behaviour
- Troubleshooting
- Testing
- Contributing
---

## Project overview

TagEase Inventory is an asset tracking prototype combining an M100 UHF RFID reader and two S3KM1110 mmWave sensors (inside / outside) to detect tags and use sensor data to infer direction (IN / OUT) through a doorway. Scans are recorded and broadcast via WebSocket to a React frontend dashboard.

Key components:
- `rfid_tracker/` — Flask app that talks to hardware, manages sensors and RFID reader, persists records to JSON, exposes WebSocket events via Flask-SocketIO (eventlet).
- `backend_inventory/` — backend admin API and auxiliary server-side code (legacy / support files).
- `frontend_inventory/` — React/Vite frontend that connects to the Pi via WebSocket and displays realtime data.

## Architecture

- Python Flask app (rfid_tracker/app.py) runs with eventlet for async SocketIO support.
- The M100 RFID reader connects over serial (configurable port). A greenthread polls it and emits events when tags are read.
- Two mmWave sensors (inside/outside) provide presence and distance readings. Sensor manager aggregates recent detections to determine direction.
- Records are saved to `data/tag_tracking.json` and emitted over SocketIO as `record_added` and `records_update`.
- Frontend uses a custom hook `useRFIDWebSocket` to receive events and update UI in real-time.

## Quick start — Raspberry Pi (production)

Prerequisites on the Pi:
- Python 3.11+ (project used 3.13 during development)
- A virtual environment with required packages (Flask, eventlet, pyserial, pytz, flask-socketio, etc.)
- Device nodes for sensors and reader mapped (see `/etc/systemd/system/rfid-tracker.service` pre-start checks)

Common commands (run on your Pi):

Restart service and check status:
```bash
sudo systemctl restart rfid-tracker.service
sudo systemctl status rfid-tracker.service --no-pager
```

Follow logs (helpful during debugging):
```bash
sudo journalctl -u rfid-tracker.service -f
```

Copy a file from your dev machine to the Pi (no git):
```powershell
# from your Windows dev machine (PowerShell)
scp path\to\local\file raspberry@<PI_IP>:/home/raspberry/rfid_tracker/app/services/
```

Install Python packages in the Pi virtualenv (if needed):
```bash
source /home/raspberry/rfid_tracker/venv/bin/activate
pip install -r /home/raspberry/rfid-tracker/requirements.txt
# or install single packages
pip install pytz eventlet flask-socketio pyserial
```

Notes:
- Systemd unit includes device wait and fuser kill steps. Make sure device node names (e.g. `/dev/ttyUSB0`) match your Pi's mapping.

## Local development (frontend)

Install dependencies and run dev server:
```bash
cd frontend_inventory
npm install
npm run dev   # or `npm run build` and `npm run preview` for production test
```

The frontend connects to the Pi's SocketIO endpoint. Set the `API_BASE_URL` constant in `IntegratedDashboard.jsx` to your Pi IP if you run frontend from another machine.

## Configuration

Main Flask configuration values live in the app config (check `rfid_tracker/app.py` or config file if present). Important keys:
- `RFID_PORT` — serial device for M100 reader (e.g. `/dev/ttyUSB0`)
- `BAUD_RATE` — serial baud rate (115200)
- `SENSOR_INSIDE_PORT`, `SENSOR_OUTSIDE_PORT` — sensor serial ports
- `DATA_FILE` — path to JSON storage (default `/home/raspberry/rfid_tracker/data/tag_tracking.json`)
- `HUMAN_DETECTION_TIMEOUT` — seconds to treat a recent sensor reading as "recent"
- `RFID_READ_POWER` — transmitter power (dBm)

If you need to change YAML/ENV-based config, modify the app config before starting the service.

## WebSocket & realtime behaviour

- Events emitted by backend (Flask-SocketIO):
  - `connection_established` — initial handshake
  - `status_update` — full status snapshot
  - `statistics_update` — aggregated counters
  - `records_update` — bulk list of recent records
  - `record_added` — a single new record (frontend now appends this in realtime)
  - `tag_detected` — emitted when a tag is read (brief notification)
  - `sensor_activity` — emitted to trigger live sensor visualization (now sent only when an RFID tag is detected and sensors confirm presence)

On the frontend, the hook `src/hooks/useRFIDWebSocket.js` listens for these events and updates UI state.

## Troubleshooting

Common problems and commands to debug:

- No tag reads:
  - Confirm service running: `sudo systemctl status rfid-tracker.service`
  - Check logs: `sudo journalctl -u rfid-tracker.service -f`
  - Confirm `/dev` mapping: `ls -la /dev/ttyUSB*` on Pi
  - Ensure RFID reader is powered and antenna is connected

- "Working outside of application context" runtime error:
  - Ensure the RFID service stores the `app` reference prior to spawning greenthread. The code sets `rfid_reader.app = app` during app initialization.

- WebSocket emit TypeError (Server.emit got unexpected keyword argument 'broadcast'):
  - Using eventlet/Flask-SocketIO the `broadcast=True` kw is not always supported; remove it and rely on default emit to broadcast.

- Wrong timestamps / timezone issues:
  - Check `date` and `timedatectl` on Pi.
  - Python timestamp creation now uses `pytz.timezone('America/Edmonton')` before formatting; ensure `pytz` is installed in venv.

Useful commands:
```bash
# check system time and timezone
date
sudo timedatectl

# tail the service logs (filter non-sensor messages to reduce noise):
sudo journalctl -u rfid-tracker.service --since '5 minutes ago' | grep -v 'Sensor '
```

## Testing

- Unit tests: (if present) run via `pytest` in project root.
- Manual test checklist:
  1. Start service on the Pi: `sudo systemctl restart rfid-tracker.service`
  2. Open dashboard and confirm WebSocket connection (status messages/console logs)
  3. Scan known RFID tag — confirm backend logs `Tag detected` and frontend shows `record_added` instantly
  4. Walk through the doorway for direction detection; confirm `IN`/`OUT` recorded

## Contributing

Please follow these steps:
1. Create a branch with a clear name
2. Run tests and linting locally
3. Open a PR with clear description and reproducer steps

Style notes:
- Backend: keep eventlet-compatible (use `eventlet.sleep` inside greenthreads), avoid threading for IO-bound greenthreads
- Frontend: keep WebSocket events idempotent — the hook `useRFIDWebSocket` appends records on `record_added` and replaces list on `records_update`.

## File locations / important paths
- `rfid_tracker/app/services/rfid_service.py` — RFID reader logic
- `rfid_tracker/app/services/sensor_service.py` — mmWave sensor logic
- `rfid_tracker/app/routes/websocket_events.py` — central WebSocket broadcast helpers
- `rfid_tracker/data/tag_tracking.json` — persisted records
- `frontend_inventory/src/hooks/useRFIDWebSocket.js` — client WebSocket hookup
- `frontend_inventory/src/pages/Dashboard/IntegratedDashboard.jsx` — Recent Activity UI and sensor visualization
---




