# RFID Tracker Service - Quick Reference

## Service Control Commands

```bash
# Start the service
sudo systemctl start rfid-tracker

# Stop the service
sudo systemctl stop rfid-tracker

# Restart the service
sudo systemctl restart rfid-tracker

# Check service status
sudo systemctl status rfid-tracker

# Enable auto-start on boot
sudo systemctl enable rfid-tracker

# Disable auto-start
sudo systemctl disable rfid-tracker
```

## Viewing Logs

```bash
# View live logs (follow mode)
sudo journalctl -u rfid-tracker -f

# View last 100 lines
sudo journalctl -u rfid-tracker -n 100

# View logs from current boot
sudo journalctl -u rfid-tracker -b

# View logs from today
sudo journalctl -u rfid-tracker --since today

# View logs with timestamps
sudo journalctl -u rfid-tracker -o short-precise

# Save logs to file
sudo journalctl -u rfid-tracker > rfid-tracker.log
```

## Troubleshooting

```bash
# Check if service is running
sudo systemctl is-active rfid-tracker

# Check if service is enabled
sudo systemctl is-enabled rfid-tracker

# View service configuration
sudo systemctl cat rfid-tracker

# Check port 5000
sudo netstat -tulpn | grep 5000
sudo lsof -i :5000

# Kill process on port 5000
sudo fuser -k 5000/tcp

# Check serial devices
ls -l /dev/rfid_reader /dev/sensor_inside /dev/sensor_outside

# Check USB devices
lsusb
ls -l /dev/ttyUSB* /dev/ttyACM*

# Test manually
cd /home/raspberry/rfid_tracker
source venv/bin/activate
python app.py
# Press Ctrl+C to stop

# Check Python packages
source /home/raspberry/rfid_tracker/venv/bin/activate
pip list | grep -i flask
pip show flask-socketio
```

## Performance Monitoring

```bash
# CPU and Memory usage
htop

# System resources
top

# Service resource usage
systemctl status rfid-tracker

# Disk usage
df -h

# Memory usage
free -h

# Process info
ps aux | grep python
```

## Network Testing

```bash
# Test HTTP endpoint
curl http://localhost:5000/

# Test from another device
curl http://<RASPBERRY_PI_IP>:5000/

# Check network connections
sudo netstat -an | grep 5000

# Get Raspberry Pi IP
hostname -I
ip addr show

# Test WebSocket (requires wscat)
sudo npm install -g wscat
wscat -c ws://localhost:5000/socket.io/?transport=websocket
```

## File Locations

```
Application:           /home/raspberry/rfid_tracker/
Service File:          /etc/systemd/system/rfid-tracker.service
Data File:             /home/raspberry/rfid_tracker/data/tag_tracking.json
Virtual Environment:   /home/raspberry/rfid_tracker/venv/
Main Script:           /home/raspberry/rfid_tracker/app.py
Configuration:         /home/raspberry/rfid_tracker/config.py
Logs:                  journalctl (systemd journal)
```

## Quick Fixes

### Service won't start
```bash
sudo journalctl -u rfid-tracker -n 50
sudo systemctl restart rfid-tracker
```

### Port already in use
```bash
sudo fuser -k 5000/tcp
sudo systemctl restart rfid-tracker
```

### Serial devices not found
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
sudo systemctl restart rfid-tracker
```

### Update application
```bash
sudo systemctl stop rfid-tracker
cd /home/raspberry/rfid_tracker
# Copy new files or git pull
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl start rfid-tracker
```

### Reset everything
```bash
sudo systemctl stop rfid-tracker
sudo fuser -k /dev/rfid_reader
sudo fuser -k /dev/sensor_inside
sudo fuser -k /dev/sensor_outside
sudo fuser -k 5000/tcp
sudo systemctl start rfid-tracker
```

## Environment Variables

The service uses these environment variables (set in service file):

```
PATH=/home/raspberry/rfid_tracker/venv/bin
PYTHONUNBUFFERED=1        # Real-time log output
FLASK_ENV=production      # Production mode
```

## Common Issues and Solutions

### Issue: Service starts but immediately stops
**Solution:** Check Python errors in logs
```bash
sudo journalctl -u rfid-tracker -n 50
```

### Issue: WebSocket not connecting
**Solution:** Verify Flask-SocketIO is installed
```bash
source /home/raspberry/rfid_tracker/venv/bin/activate
pip show flask-socketio python-socketio
```

### Issue: High memory usage
**Solution:** Pi Zero 2W has 512MB RAM. Monitor with:
```bash
free -h
htop
```
Consider reducing log verbosity in config.py

### Issue: Can't access from network
**Solution:** Check firewall and IP
```bash
hostname -I
sudo ufw status
sudo ufw allow 5000/tcp
```

## Deployment Checklist

- [ ] Files transferred to `/home/raspberry/rfid_tracker/`
- [ ] Virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Data directory created (`/home/raspberry/rfid_tracker/data/`)
- [ ] Service file copied to `/etc/systemd/system/`
- [ ] Service enabled (`sudo systemctl enable rfid-tracker`)
- [ ] Service started (`sudo systemctl start rfid-tracker`)
- [ ] Service is running (`sudo systemctl status rfid-tracker`)
- [ ] Port 5000 is listening (`sudo netstat -tulpn | grep 5000`)
- [ ] WebSocket tested (curl and frontend connection)
- [ ] Auto-start verified (reboot and check)

## Frontend Configuration

Update `RFIDDashboard.jsx` with Raspberry Pi IP:

```javascript
const API_BASE_URL = 'http://<RASPBERRY_PI_IP>:5000';
```

Get Pi IP:
```bash
hostname -I | awk '{print $1}'
```

## Reboot and Test

```bash
# Reboot Pi
sudo reboot

# After reboot, SSH back in and check
ssh raspberry@<PI_IP>
sudo systemctl status rfid-tracker

# Should show "active (running)"
```

## Backup Commands

```bash
# Backup application
cd /home/raspberry
tar -czf rfid_tracker_backup_$(date +%Y%m%d).tar.gz rfid_tracker/

# Backup data only
tar -czf rfid_data_backup_$(date +%Y%m%d).tar.gz rfid_tracker/data/

# Copy backup to Windows
# From Windows PowerShell:
scp raspberry@<PI_IP>:/home/raspberry/rfid_tracker_backup_*.tar.gz C:\Backups\
```

## Security Hardening

```bash
# Change default password
passwd

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Enable firewall
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 5000/tcp
sudo ufw enable

# Disable password SSH (use keys only)
# sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# sudo systemctl restart ssh
```
