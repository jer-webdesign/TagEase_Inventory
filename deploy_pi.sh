#!/bin/bash
# ========================================
# RFID Tracker - Raspberry Pi Deployment Script
# ========================================
# This script automates the deployment of the RFID tracking system
# with WebSocket support on Raspberry Pi Zero 2W

set -e  # Exit on error

echo "=========================================="
echo "RFID Tracker Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/raspberry/rfid_tracker"
SERVICE_FILE="rfid-tracker.service"
VENV_DIR="$APP_DIR/venv"

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo: sudo bash deploy_pi.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Checking system...${NC}"
# Get actual user (in case of sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
echo "Running as: $ACTUAL_USER (sudo)"

echo ""
echo -e "${GREEN}Step 2: Installing system dependencies...${NC}"
apt-get update
apt-get install -y python3 python3-pip python3-venv build-essential python3-dev libffi-dev libssl-dev

echo ""
echo -e "${GREEN}Step 3: Creating application directory...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR does not exist. Please transfer files first."
    echo "Use: scp -r C:\\TagEase_Inventory_V93\\rfid_tracker raspberry@<PI_IP>:/home/raspberry/"
    exit 1
fi

cd "$APP_DIR"

echo ""
echo -e "${GREEN}Step 4: Setting up Python virtual environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    sudo -u $ACTUAL_USER python3 -m venv "$VENV_DIR"
fi

echo ""
echo -e "${GREEN}Step 5: Installing Python dependencies...${NC}"
sudo -u $ACTUAL_USER "$VENV_DIR/bin/pip" install --upgrade pip
sudo -u $ACTUAL_USER "$VENV_DIR/bin/pip" install -r requirements.txt

echo ""
echo -e "${GREEN}Step 6: Creating data directory...${NC}"
mkdir -p "$APP_DIR/data"
chown -R $ACTUAL_USER:$ACTUAL_USER "$APP_DIR/data"
chmod 755 "$APP_DIR/data"

echo ""
echo -e "${GREEN}Step 7: Installing systemd service...${NC}"
if [ -f "$APP_DIR/../$SERVICE_FILE" ]; then
    cp "$APP_DIR/../$SERVICE_FILE" /etc/systemd/system/
    chmod 644 /etc/systemd/system/$SERVICE_FILE
    echo "Service file installed."
elif [ -f "$APP_DIR/$SERVICE_FILE" ]; then
    cp "$APP_DIR/$SERVICE_FILE" /etc/systemd/system/
    chmod 644 /etc/systemd/system/$SERVICE_FILE
    echo "Service file installed."
else
    echo -e "${YELLOW}Warning: Service file not found. Please copy it manually.${NC}"
    echo "Expected location: $APP_DIR/../$SERVICE_FILE or $APP_DIR/$SERVICE_FILE"
fi

echo ""
echo -e "${GREEN}Step 8: Configuring systemd service...${NC}"
systemctl daemon-reload
systemctl enable rfid-tracker
echo "Service enabled for auto-start on boot."

echo ""
echo -e "${GREEN}Step 9: Checking serial devices...${NC}"
if [ -e /dev/rfid_reader ] && [ -e /dev/sensor_inside ] && [ -e /dev/sensor_outside ]; then
    echo -e "${GREEN}✓ All serial devices found${NC}"
    ls -l /dev/rfid_reader /dev/sensor_inside /dev/sensor_outside
else
    echo -e "${YELLOW}⚠ Warning: Some serial devices not found${NC}"
    echo "Available USB devices:"
    ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "No USB serial devices found"
    echo ""
    echo "You may need to set up udev rules for device symlinks."
fi

echo ""
echo -e "${GREEN}Step 10: Starting service...${NC}"
systemctl start rfid-tracker

echo ""
echo "Waiting for service to start..."
sleep 3

echo ""
echo -e "${GREEN}Step 11: Checking service status...${NC}"
if systemctl is-active --quiet rfid-tracker; then
    echo -e "${GREEN}✓ Service is running!${NC}"
    systemctl status rfid-tracker --no-pager -l
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check logs with: sudo journalctl -u rfid-tracker -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 12: Checking network port...${NC}"
sleep 2
if netstat -tulpn | grep -q ":5000"; then
    echo -e "${GREEN}✓ Server is listening on port 5000${NC}"
    netstat -tulpn | grep ":5000"
else
    echo -e "${YELLOW}⚠ Port 5000 not listening yet. Check logs.${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Service Management Commands:"
echo "  Start:   sudo systemctl start rfid-tracker"
echo "  Stop:    sudo systemctl stop rfid-tracker"
echo "  Restart: sudo systemctl restart rfid-tracker"
echo "  Status:  sudo systemctl status rfid-tracker"
echo "  Logs:    sudo journalctl -u rfid-tracker -f"
echo ""
echo "Test WebSocket connection:"
echo "  curl http://localhost:5000/"
echo ""
echo "Access from network:"
echo "  http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo -e "${GREEN}Update your frontend API_BASE_URL to:${NC}"
echo "  const API_BASE_URL = 'http://$(hostname -I | awk '{print $1}'):5000';"
echo ""
