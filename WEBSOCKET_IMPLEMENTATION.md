# WebSocket Implementation Guide - RFID Tracking System

## Overview

This document describes the WebSocket implementation that enables real-time, bidirectional communication between the Flask backend (rfid_tracker) and the React frontend (frontend_inventory).

## Architecture

### Backend (Flask + Flask-SocketIO)

**Technology Stack:**
- Flask 3.1.2
- Flask-SocketIO 5.4.1
- python-socketio 5.12.0

**Key Components:**

1. **`app/__init__.py`** - Initializes SocketIO instance
2. **`app/routes/websocket_events.py`** - WebSocket event handlers
3. **`app/services/tracking_service.py`** - Emits events when records are added
4. **`app/services/rfid_service.py`** - Emits events when tags are detected
5. **`app.py`** - Main entry point using `socketio.run()`

### Frontend (React + socket.io-client)

**Technology Stack:**
- React 19.1.1
- socket.io-client 4.8.1
- Vite 7.1.7

**Key Components:**

1. **`src/hooks/useRFIDWebSocket.js`** - Custom React hook for WebSocket management
2. **`src/pages/Dashboard/RFIDDashboard.jsx`** - Dashboard using WebSocket for real-time updates

## Installation

### Backend

1. Navigate to the rfid_tracker directory:
```powershell
cd c:\TagEase_Inventory_V93\rfid_tracker
```

2. Install dependencies:
```powershell
pip install -r requirements.txt
```

This will install:
- Flask-SocketIO 5.4.1
- python-socketio 5.12.0
- And all other required packages

### Frontend

The frontend already has socket.io-client installed. No additional installation needed.

## Running the Application

### Start Backend

```powershell
cd c:\TagEase_Inventory_V93
python app.py
```

Or from rfid_tracker folder:
```powershell
cd c:\TagEase_Inventory_V93\rfid_tracker
python ../app.py
```

The server will start on `http://0.0.0.0:5000` with WebSocket support.

### Start Frontend

```powershell
cd c:\TagEase_Inventory_V93\frontend_inventory
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy).

## WebSocket Events

### Client → Server (Emitted by Frontend)

| Event Name | Data | Description |
|------------|------|-------------|
| `connect` | - | Automatic connection event |
| `disconnect` | - | Automatic disconnection event |
| `request_status` | - | Request current system status |
| `request_statistics` | - | Request current statistics |
| `request_records` | `{ limit?: number, direction?: string }` | Request records with filters |
| `configure_rfid_power` | `{ power: number }` | Set RFID reader power (10-30 dBm) |
| `configure_sensor_range` | `{ location: 'inside'\|'outside', distance: number }` | Set sensor detection range |
| `add_manual_record` | `{ rfid_tag: string, direction: 'IN'\|'OUT' }` | Manually add a record |
| `clear_records` | `{ confirm: true }` | Clear all records |
| `ping` | - | Connection keepalive |

### Server → Client (Emitted by Backend)

| Event Name | Data | Description |
|------------|------|-------------|
| `connection_established` | `{ message: string, client_id: string }` | Connection confirmation |
| `status_update` | `SystemStatus` | System status update |
| `statistics_update` | `Statistics` | Statistics update |
| `records_update` | `{ records: Record[], count: number }` | Records list update |
| `tag_detected` | `{ tag_id: string, direction?: string, timestamp: string }` | RFID tag detected |
| `record_added` | `{ record: Record }` | New record added |
| `sensor_activity` | `{ location: 'inside'\|'outside', detected: boolean, distance: number, timestamp: string }` | Sensor detection event |
| `config_update` | `{ rfid_power: number, sensor_range: number }` | Configuration changed |
| `records_cleared` | `{}` | All records cleared |
| `error` | `{ message: string }` | Error message |
| `success` | `{ message: string }` | Success message |
| `pong` | `{ timestamp: string }` | Response to ping |

## Data Types

### SystemStatus
```typescript
{
  rfid_reader: 'connected' | 'disconnected' | 'error',
  sensor_inside: 'connected' | 'disconnected' | 'error',
  sensor_outside: 'connected' | 'disconnected' | 'error',
  total_records: number,
  last_tag_read?: Record,
  timestamp: string
}
```

### Statistics
```typescript
{
  total_records: number,
  in_count: number,
  out_count: number,
  unique_tags: number,
  current_balance: number,
  top_tags: Array<{ tag: string, count: number }>
}
```

### Record
```typescript
{
  rfid_tag: string,
  direction: 'IN' | 'OUT',
  read_date: string,  // Format: YYYY-MM-DD-HH-MM-SS-ms
  timestamp: number
}
```

## Usage in Frontend

### Using the Custom Hook

```jsx
import useRFIDWebSocket from '../hooks/useRFIDWebSocket';

const MyComponent = () => {
  const {
    isConnected,
    systemStatus,
    statistics,
    recentRecords,
    lastTagDetected,
    sensorActivity,
    configureRFIDPower,
    configureSensorRange,
    addManualRecord,
    clearRecords
  } = useRFIDWebSocket('http://192.168.182.237:5000');

  // Connection status
  useEffect(() => {
    console.log('WebSocket connected:', isConnected);
  }, [isConnected]);

  // React to tag detection
  useEffect(() => {
    if (lastTagDetected) {
      console.log('Tag detected:', lastTagDetected.tag_id);
    }
  }, [lastTagDetected]);

  // Configure RFID power
  const handlePowerChange = (power) => {
    configureRFIDPower(power);
  };

  // Configure sensor range
  const handleRangeChange = (location, distance) => {
    configureSensorRange(location, distance);
  };

  return (
    <div>
      <h1>Status: {isConnected ? 'Connected' : 'Disconnected'}</h1>
      <p>Total Records: {statistics?.total_records || 0}</p>
    </div>
  );
};
```

## Real-time Features

### 1. **Live Tag Detection**
- When an RFID tag is detected, all connected clients receive a `tag_detected` event instantly
- No polling required - updates are pushed immediately

### 2. **Live Statistics**
- Statistics update automatically when records are added
- All clients see the same data in real-time

### 3. **Sensor Activity**
- Live sensor detection events show when motion is detected
- Distance information for visualization

### 4. **Configuration Sync**
- When one client changes configuration, all clients are notified
- Ensures all views stay synchronized

## Benefits Over Polling

### Before (Polling):
```javascript
// Inefficient polling every 2-10 seconds
useEffect(() => {
  const interval = setInterval(fetchRecords, 2000);
  return () => clearInterval(interval);
}, []);
```

**Problems:**
- ❌ Delayed updates (2-10 second lag)
- ❌ Unnecessary API calls when no changes
- ❌ Higher server load
- ❌ Higher bandwidth usage
- ❌ Not truly real-time

### After (WebSockets):
```javascript
// Real-time updates via WebSocket
const { recentRecords } = useRFIDWebSocket(API_BASE_URL);
```

**Benefits:**
- ✅ Instant updates (<100ms latency)
- ✅ Updates only when data changes
- ✅ Lower server load
- ✅ Lower bandwidth usage
- ✅ True real-time experience
- ✅ Bidirectional communication

## Testing

### 1. Test Connection
Open browser console and check for:
```
✅ WebSocket connected: <socket-id>
Connection established: { message: '...', client_id: '...' }
```

### 2. Test Tag Detection
When a tag is scanned:
```
🏷️ Tag detected: { tag_id: '...', direction: 'IN', timestamp: '...' }
📝 Record added: { record: {...} }
```

### 3. Test Configuration
Change RFID power or sensor range:
```
⚙️ Config update: { rfid_power: 26, sensor_range: 5 }
```

### 4. Test Multiple Clients
1. Open dashboard in multiple browser tabs
2. Make changes in one tab
3. All tabs should update simultaneously

## Troubleshooting

### Connection Issues

**Problem:** WebSocket not connecting

**Solutions:**
1. Verify Flask-SocketIO is installed:
   ```powershell
   pip show flask-socketio
   ```

2. Check server is running with socketio.run():
   ```python
   socketio.run(app, host='0.0.0.0', port=5000)
   ```

3. Verify CORS is enabled in backend:
   ```python
   socketio = SocketIO(app, cors_allowed_origins="*")
   ```

4. Check browser console for connection errors

### Event Not Received

**Problem:** Events not appearing in frontend

**Solutions:**
1. Check browser console for errors
2. Verify event names match exactly (case-sensitive)
3. Check if WebSocket is connected: `isConnected` should be true
4. Use browser DevTools Network tab → WS filter to inspect WebSocket frames

### Data Not Updating

**Problem:** Data received but UI not updating

**Solutions:**
1. Verify React state dependencies in useEffect hooks
2. Check that hook is properly handling events
3. Ensure component is using the hook correctly

## Performance Considerations

### Backend
- WebSocket events are emitted in background threads
- No blocking of main application logic
- Automatic reconnection handling

### Frontend
- Single WebSocket connection per client
- Automatic reconnection with exponential backoff
- Cleanup on component unmount

## Security Notes

### Production Recommendations

1. **CORS Configuration:**
   ```python
   # Development
   socketio = SocketIO(app, cors_allowed_origins="*")
   
   # Production
   socketio = SocketIO(app, cors_allowed_origins=["https://yourdomain.com"])
   ```

2. **Authentication:**
   Add authentication to WebSocket connections:
   ```python
   @socketio.on('connect')
   def handle_connect(auth):
       if not verify_token(auth.get('token')):
           return False  # Reject connection
   ```

3. **Rate Limiting:**
   Implement rate limiting for WebSocket events to prevent abuse

## Additional Resources

- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)

## Summary

The WebSocket implementation provides:
- ✅ Real-time bidirectional communication
- ✅ Instant updates without polling
- ✅ Lower server load and bandwidth
- ✅ Better user experience
- ✅ Scalable architecture
- ✅ Easy to extend with new events

All polling has been removed from RFIDDashboard.jsx and replaced with event-driven WebSocket updates.

## Deployment on Raspberry Pi Zero 2W

The backend is designed to run on Raspberry Pi Zero 2W as a systemd service for automatic startup on boot.

### Quick Deployment

1. **Transfer files to Raspberry Pi:**
   ```powershell
   # From Windows PowerShell
   scp -r C:\TagEase_Inventory_V93\rfid_tracker raspberry@<PI_IP>:/home/raspberry/
   scp C:\TagEase_Inventory_V93\app.py raspberry@<PI_IP>:/home/raspberry/rfid_tracker/
   scp C:\TagEase_Inventory_V93\rfid-tracker.service raspberry@<PI_IP>:/home/raspberry/
   scp C:\TagEase_Inventory_V93\deploy_pi.sh raspberry@<PI_IP>:/home/raspberry/
   ```

2. **Run deployment script:**
   ```bash
   # SSH into Raspberry Pi
   ssh raspberry@<PI_IP>
   
   # Run deployment script
   chmod +x /home/raspberry/deploy_pi.sh
   sudo bash /home/raspberry/deploy_pi.sh
   ```

3. **Update frontend with Pi IP:**
   ```javascript
   // In RFIDDashboard.jsx
   const API_BASE_URL = 'http://<RASPBERRY_PI_IP>:5000';
   ```

### Service Management

```bash
# Start/Stop/Restart
sudo systemctl start rfid-tracker
sudo systemctl stop rfid-tracker
sudo systemctl restart rfid-tracker

# View status
sudo systemctl status rfid-tracker

# View logs
sudo journalctl -u rfid-tracker -f
```

### Detailed Documentation

For complete deployment instructions, troubleshooting, and service management:
- **[RASPBERRY_PI_DEPLOYMENT.md](RASPBERRY_PI_DEPLOYMENT.md)** - Comprehensive deployment guide
- **[SERVICE_QUICK_REFERENCE.md](SERVICE_QUICK_REFERENCE.md)** - Quick command reference

### Auto-start on Boot

The service is configured to:
- ✅ Start automatically on boot
- ✅ Wait for serial devices to be ready
- ✅ Restart automatically on failure
- ✅ Clean up resources on stop
- ✅ Log to systemd journal

The application will be accessible at `http://<RASPBERRY_PI_IP>:5000` and supports WebSocket connections from any device on the network.
