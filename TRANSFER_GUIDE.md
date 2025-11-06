# How to Transfer Files to Raspberry Pi

This guide explains how to transfer the RFID tracker files from Windows to your Raspberry Pi.

## Method 1: Using Windows Command Prompt (cmd.exe)

If you're using Windows Command Prompt (cmd.exe), use the **batch file**:

```cmd
transfer_to_pi.bat 192.168.182.23
```

Replace `192.168.182.23` with your Raspberry Pi's actual IP address.

## Method 2: Using PowerShell

If you're using PowerShell, use the **PowerShell script**:

```powershell
.\transfer_to_pi.ps1 192.168.182.23
```

Replace `192.168.182.23` with your Raspberry Pi's actual IP address.

## Method 3: Using PowerShell from Command Prompt

You can also run the PowerShell script from cmd.exe using:

```cmd
powershell.exe -ExecutionPolicy Bypass -File transfer_to_pi.ps1 -PiIP 192.168.182.23
```

## Prerequisites

1. **OpenSSH Client** must be installed on Windows
   - Check if installed: Open Settings → Apps → Optional Features
   - Search for "OpenSSH Client"
   - If not installed, click "Add a feature" and install it

2. **Raspberry Pi** must be accessible on the network
   - Default credentials: `pi` / `raspberry`
   - SSH must be enabled on the Pi

3. **Network connectivity** between Windows and Raspberry Pi

## What Gets Transferred

The script transfers the following files/folders:

- `rfid_tracker/` - Main application folder
- `app.py` - Main Flask application
- `rfid-tracker.service` - Systemd service file
- `deploy_pi.sh` - Deployment script
- Documentation files (`.md` files)

## After Transfer

Once the transfer completes, SSH into your Raspberry Pi and run the deployment script:

```bash
ssh pi@192.168.182.23
chmod +x /home/raspberry/deploy_pi.sh
sudo bash /home/raspberry/deploy_pi.sh
```

## Troubleshooting

### Script Opens in Text Editor Instead of Running

**Problem**: When you run `.\transfer_to_pi.ps1` in Command Prompt, it opens in Notepad.

**Solution**: You're using Command Prompt (cmd.exe), not PowerShell. Use one of these options:

1. Use the batch file: `transfer_to_pi.bat 192.168.182.23`
2. Open PowerShell instead: Press Win+X → Windows PowerShell
3. Run via cmd: `powershell.exe -ExecutionPolicy Bypass -File transfer_to_pi.ps1 -PiIP 192.168.182.23`

### ExecutionPolicy Error

**Problem**: `cannot be loaded because running scripts is disabled`

**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use the batch file which bypasses this restriction.

### SCP Not Found

**Problem**: `scp command not found`

**Solution**: Install OpenSSH Client from Windows Optional Features.

### Connection Refused

**Problem**: Cannot connect to Raspberry Pi

**Solution**: 
1. Verify the Pi's IP address: `ping 192.168.182.23`
2. Ensure SSH is enabled on the Pi
3. Check if the Pi is powered on and connected to the network

### Permission Denied

**Problem**: SSH password authentication fails

**Solution**: 
1. Default credentials are `pi` / `raspberry`
2. If you changed the password, update the script or enter it when prompted
3. You can specify a different username: `.\transfer_to_pi.ps1 -PiIP 192.168.182.23 -PiUser youruser`

## Quick Reference

| Shell | Command |
|-------|---------|
| Command Prompt (cmd) | `transfer_to_pi.bat <IP>` |
| PowerShell | `.\transfer_to_pi.ps1 <IP>` |
| PowerShell (custom user) | `.\transfer_to_pi.ps1 -PiIP <IP> -PiUser <username>` |

## Finding Your Raspberry Pi's IP Address

From the Raspberry Pi terminal:
```bash
hostname -I
```

Or from Windows (if Pi is on the network):
```cmd
arp -a
```
Look for a device with "Raspberry Pi" or check your router's connected devices.
