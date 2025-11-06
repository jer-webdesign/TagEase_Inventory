# Raspberry Pi Zero 2W Deployment Guide - RFID Tracker with WebSocket

## Overview

This guide explains how to deploy the RFID tracking application with WebSocket support to a Raspberry Pi Zero 2W and configure it to run automatically as a systemd service.

## Prerequisites

- Raspberry Pi Zero 2W with Raspberry Pi OS installed
- SSH access to the Pi
- Internet connection on the Pi
- RFID reader and sensors properly connected

## Step 1: Prepare the Raspberry Pi

### 1.1 Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 1.2 Install Required System Packages

```bash
sudo apt-get install -y python3 python3-pip python3-venv git
```

### 1.3 Install Additional Dependencies for Flask-SocketIO

```bash
# Install build tools for eventlet/gevent (optional but recommended)
sudo apt-get install -y build-essential python3-dev
```

## Step 2: Transfer Application Files

### Option A: Using Git (Recommended)

```bash
cd /home/raspberry
git clone <your-repository-url> rfid_tracker
cd rfid_tracker
```

### Option B: Using SCP from Windows

From your Windows machine (PowerShell):

```powershell
# Transfer the entire rfid_tracker folder
scp -r C:\TagEase_Inventory_V93\rfid_tracker raspberry@<PI_IP_ADDRESS>:/home/raspberry/

# Transfer app.py to the rfid_tracker folder
scp C:\TagEase_Inventory_V93\app.py raspberry@<PI_IP_ADDRESS>:/home/raspberry/rfid_tracker/

# Transfer the service file
scp C:\TagEase_Inventory_V93\rfid-tracker.service raspberry@<PI_IP_ADDRESS>:/home/raspberry/
```

## Step 3: Set Up Python Virtual Environment

SSH into your Raspberry Pi and run:

```bash
cd /home/raspberry/rfid_tracker

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Expected Packages

The requirements.txt should install:
- Flask==3.1.2
- Flask-CORS==6.0.1
- Flask-SocketIO==5.4.1
- python-socketio==5.12.0
- pyserial==3.5
- python-dotenv==1.2.0
- requests==2.32.5

### Troubleshooting: If Installation Fails

On Raspberry Pi Zero 2W (ARM architecture), some packages may need compilation:

```bash
# Install dependencies for building Python packages
sudo apt-get install -y libffi-dev libssl-dev

# If eventlet/gevent fail, you can use threading mode (already configured)
# Flask-SocketIO will automatically use threading if eventlet/gevent are not available
```

## Step 4: Configure the Application

### 4.1 Verify Configuration File

Edit `/home/raspberry/rfid_tracker/config.py` if needed:

```python
class ProductionConfig(Config):
    DEBUG = False
    # Ensure data file path is correct
    DATA_FILE = '/home/raspberry/rfid_tracker/data/tag_tracking.json'
```

### 4.2 Create Data Directory

```bash
mkdir -p /home/raspberry/rfid_tracker/data
chmod 755 /home/raspberry/rfid_tracker/data
```

### 4.3 Test the Application Manually

```bash
cd /home/raspberry/rfid_tracker
source venv/bin/activate
python app.py
```

You should see:
```
Starting RFID Tracking Server (production mode)...
SocketIO initialized for SSH terminal support
✅ RFID WebSocket handlers registered
...
```

Press `Ctrl+C` to stop the test run.

## Step 5: Install systemd Service

### 5.1 Copy Service File

```bash
sudo cp /home/raspberry/rfid-tracker.service /etc/systemd/system/
```

### 5.2 Set Permissions

```bash
sudo chmod 644 /etc/systemd/system/rfid-tracker.service
```

### 5.3 Reload systemd

```bash
sudo systemctl daemon-reload
```

### 5.4 Enable Service (Auto-start on boot)

```bash
sudo systemctl enable rfid-tracker
```

### 5.5 Start Service

```bash
sudo systemctl start rfid-tracker
```

## Step 6: Verify Service Status

### Check Service Status

```bash
sudo systemctl status rfid-tracker
```

Expected output:
```
● rfid-tracker.service - RFID Asset Tracking Service with WebSocket (RFID + Sensors)
     Loaded: loaded (/etc/systemd/system/rfid-tracker.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

### View Live Logs

```bash
# View all logs
sudo journalctl -u rfid-tracker -f

# View logs from current boot
sudo journalctl -u rfid-tracker -b

# View last 100 lines
sudo journalctl -u rfid-tracker -n 100
```

### Check if Port 5000 is Open

```bash
sudo netstat -tulpn | grep 5000
```

Expected output:
```
tcp        0      0 0.0.0.0:5000            0.0.0.0:*               LISTEN      <PID>/python
```

## Step 7: Configure Firewall (Optional)

If you have a firewall enabled:

```bash
sudo ufw allow 5000/tcp
sudo ufw reload
```

## Step 8: Test WebSocket Connection

### From Raspberry Pi

```bash
# Install curl if not present
sudo apt-get install -y curl

# Test HTTP endpoint
curl http://localhost:5000/

# Test WebSocket (requires wscat)
sudo npm install -g wscat
wscat -c ws://localhost:5000/socket.io/?transport=websocket
```

### From Your Windows Machine

Update the frontend to use the Raspberry Pi's IP:

In `RFIDDashboard.jsx`:
```javascript
const API_BASE_URL = 'http://<RASPBERRY_PI_IP>:5000';
```

Then start the frontend:
```powershell
cd C:\TagEase_Inventory_V93\frontend_inventory
npm run dev
```

Open browser and check for the "🟢 Live" indicator.

## Service Management Commands

### Start Service
```bash
sudo systemctl start rfid-tracker
```

### Stop Service
```bash
sudo systemctl stop rfid-tracker
```

### Restart Service
```bash
sudo systemctl restart rfid-tracker
```

### Check Status
```bash
sudo systemctl status rfid-tracker
```

### Enable Auto-start
```bash
sudo systemctl enable rfid-tracker
```

### Disable Auto-start
```bash
sudo systemctl disable rfid-tracker
```

### View Logs
```bash
sudo journalctl -u rfid-tracker -f
```

## Troubleshooting

### Service Fails to Start

1. **Check logs:**
   ```bash
   sudo journalctl -u rfid-tracker -n 50
   ```

2. **Check serial device permissions:**
   ```bash
   ls -l /dev/rfid_reader /dev/sensor_inside /dev/sensor_outside
   ```

3. **Verify udev rules are set up:**
   ```bash
   ls -l /etc/udev/rules.d/99-rfid-sensors.rules
   ```

4. **Test manually:**
   ```bash
   cd /home/raspberry/rfid_tracker
   source venv/bin/activate
   python app.py
   ```

### WebSocket Not Connecting

1. **Verify Flask-SocketIO is installed:**
   ```bash
   source /home/raspberry/rfid_tracker/venv/bin/activate
   pip show flask-socketio
   ```

2. **Check if port 5000 is listening:**
   ```bash
   sudo netstat -tulpn | grep 5000
   ```

3. **Check firewall:**
   ```bash
   sudo ufw status
   ```

4. **Verify CORS settings** in `app/__init__.py`:
   ```python
   socketio = SocketIO(app, cors_allowed_origins="*")
   ```

### Port Already in Use

```bash
# Kill process using port 5000
sudo fuser -k 5000/tcp

# Restart service
sudo systemctl restart rfid-tracker
```

### Serial Devices Not Found

1. **Check USB devices:**
   ```bash
   lsusb
   ls -l /dev/ttyUSB* /dev/ttyACM*
   ```

2. **Check udev rules:**
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

3. **Verify device symlinks:**
   ```bash
   ls -l /dev/rfid_reader /dev/sensor_*
   ```

### High Memory Usage on Pi Zero 2W

Raspberry Pi Zero 2W has limited RAM (512MB). To optimize:

1. **Use threading mode** (already configured in code):
   ```python
   socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
   ```

2. **Monitor memory:**
   ```bash
   free -h
   htop
   ```

3. **If needed, reduce concurrent connections** by adding limits in websocket_events.py

### Service Won't Stop

```bash
# Force kill
sudo systemctl kill rfid-tracker

# Check for zombie processes
ps aux | grep python

# Kill all Python processes (use with caution)
sudo pkill -9 python
```

## Performance Optimization for Pi Zero 2W

### 1. Reduce Logging

Edit `config.py`:
```python
class ProductionConfig(Config):
    DEBUG = False
    # Reduce log verbosity
```

### 2. Optimize Python

```bash
# Use Python optimizations
sudo nano /etc/systemd/system/rfid-tracker.service

# Add to [Service] section:
Environment="PYTHONOPTIMIZE=2"
```

### 3. Monitor Performance

```bash
# CPU and Memory
htop

# Service resource usage
systemctl status rfid-tracker

# Detailed process info
ps aux | grep python
```

## Network Configuration

### Static IP (Recommended)

Edit `/etc/dhcpcd.conf`:
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Restart networking:
```bash
sudo systemctl restart dhcpcd
```

### Enable SSH (if not already)

```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```

## Backup and Updates

### Create Backup

```bash
# Backup application and data
cd /home/raspberry
tar -czf rfid_tracker_backup_$(date +%Y%m%d).tar.gz rfid_tracker/

# Copy to another location
scp rfid_tracker_backup_*.tar.gz user@backup-server:/path/to/backup/
```

### Update Application

```bash
# Stop service
sudo systemctl stop rfid-tracker

# Pull updates (if using git)
cd /home/raspberry/rfid_tracker
git pull

# Or copy new files via SCP
# scp -r C:\TagEase_Inventory_V93\rfid_tracker\app raspberry@<PI_IP>:/home/raspberry/rfid_tracker/

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart service
sudo systemctl restart rfid-tracker
```

## Security Recommendations

### 1. Change Default Password

```bash
passwd
```

### 2. Use SSH Keys Instead of Passwords

From Windows, generate SSH key and copy to Pi:
```powershell
ssh-keygen
scp ~/.ssh/id_rsa.pub raspberry@<PI_IP>:~/.ssh/authorized_keys
```

### 3. Disable Password Authentication (Optional)

```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

### 4. Enable Firewall

```bash
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 5000/tcp
sudo ufw enable
```

### 5. Update WebSocket CORS for Production

In `app/__init__.py`:
```python
# Replace * with specific domain
socketio = SocketIO(app, cors_allowed_origins=["http://your-frontend-domain.com"])
```

## Auto-start on Boot Verification

After setup, reboot the Pi to verify auto-start:

```bash
sudo reboot
```

Wait for Pi to boot, then check:

```bash
# SSH back in
ssh raspberry@<PI_IP>

# Check service status
sudo systemctl status rfid-tracker
```

The service should be "active (running)".

## Monitoring and Maintenance

### Set Up Log Rotation

Create `/etc/logrotate.d/rfid-tracker`:

```bash
sudo nano /etc/logrotate.d/rfid-tracker
```

Add:
```
/var/log/rfid-tracker/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

### Create Monitoring Script

```bash
nano /home/raspberry/monitor_rfid.sh
```

Add:
```bash
#!/bin/bash
if ! systemctl is-active --quiet rfid-tracker; then
    echo "RFID service down, restarting..."
    sudo systemctl restart rfid-tracker
fi
```

Make executable:
```bash
chmod +x /home/raspberry/monitor_rfid.sh
```

Add to crontab (check every 5 minutes):
```bash
crontab -e
# Add:
*/5 * * * * /home/raspberry/monitor_rfid.sh
```

## Summary

Your RFID tracking system with WebSocket support is now:

✅ Running as a systemd service
✅ Auto-starting on boot
✅ Automatically restarting on failure
✅ Logging to systemd journal
✅ Accessible on network at `http://<PI_IP>:5000`
✅ Supporting real-time WebSocket connections

The frontend can connect from any device on the network and receive real-time updates via WebSocket!
