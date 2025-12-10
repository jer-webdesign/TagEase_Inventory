# ========================================
# RFID Tracker - Transfer Dispatcher Integration Files to Raspberry Pi Zero 2W
# ========================================
# This script transfers the 4 modified files for dispatcher integration
# Usage: .\transfer_dispatcher_update.ps1 <raspberry_pi_ip>

param(
    [Parameter(Mandatory=$true)]
    [string]$PiIP,
    
    [Parameter(Mandatory=$false)]
    [string]$PiUser = "raspberry"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "RFID Tracker - Dispatcher Integration Update" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$SourceDir = "C:\TagEase_Inventory_V99"

# List of files modified for dispatcher integration
$UpdatedFiles = @(
    "rfid_tracker\config.py",
    "rfid_tracker\app\utils\helpers.py",
    "rfid_tracker\app\services\tracking_service.py",
    "rfid_tracker\.env"
)

Write-Host "Source Directory: $SourceDir" -ForegroundColor Cyan
Write-Host "Destination: ${PiUser}@${PiIP}:/home/${PiUser}/" -ForegroundColor Cyan
Write-Host ""

# Check if scp is available
try {
    scp 2>&1 | Out-Null
} catch {
    Write-Host "Error: scp command not found. Please install OpenSSH Client." -ForegroundColor Red
    Write-Host "Install via: Settings > Apps > Optional Features > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Testing connection to Raspberry Pi Zero 2W..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $PiIP -Count 2 -Quiet

if (-not $pingResult) {
    Write-Host "Warning: Cannot ping $PiIP. The Pi might be offline." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Transfer cancelled." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ??? Pi is reachable" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Backing up existing files on Raspberry Pi..." -ForegroundColor Yellow
try {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    ssh "${PiUser}@${PiIP}" "mkdir -p /home/${PiUser}/rfid_tracker_backup_${timestamp}" 2>$null
    ssh "${PiUser}@${PiIP}" "cp /home/${PiUser}/rfid_tracker/config.py /home/${PiUser}/rfid_tracker_backup_${timestamp}/ 2>/dev/null; exit 0"
    ssh "${PiUser}@${PiIP}" "cp /home/${PiUser}/rfid_tracker/app/utils/helpers.py /home/${PiUser}/rfid_tracker_backup_${timestamp}/ 2>/dev/null; exit 0"
    ssh "${PiUser}@${PiIP}" "cp /home/${PiUser}/rfid_tracker/app/services/tracking_service.py /home/${PiUser}/rfid_tracker_backup_${timestamp}/ 2>/dev/null; exit 0"
    Write-Host "  ??? Backup created" -ForegroundColor Green
} catch {
    Write-Host "  ?????? Backup skipped (first-time setup?)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Transferring dispatcher integration files..." -ForegroundColor Yellow

$transferCount = 0
foreach ($file in $UpdatedFiles) {
    $sourcePath = Join-Path $SourceDir $file
    $fileName = Split-Path $file -Leaf
    $relativePath = $file -replace '\\', '/'
    
    if (Test-Path $sourcePath) {
        try {
            Write-Host "  ???? Transferring $fileName..." -ForegroundColor Gray
            
            # Create directory structure on Pi if needed
            $remoteDir = "rfid_tracker/" + ($file -replace '\\[^\\]*$', '' -replace '\\', '/' -replace 'rfid_tracker/', '')
            if ($remoteDir -ne "rfid_tracker/") {
                ssh "${PiUser}@${PiIP}" "mkdir -p /home/${PiUser}/$remoteDir" 2>$null
            }
            
            # Transfer the file
            scp -q "$sourcePath" "${PiUser}@${PiIP}:/home/${PiUser}/$relativePath"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "     ??? $fileName transferred successfully" -ForegroundColor Green
                $transferCount++
            } else {
                Write-Host "     ??? Failed to transfer $fileName" -ForegroundColor Red
            }
        } catch {
            Write-Host "     ??? Failed to transfer $fileName" -ForegroundColor Red
            Write-Host "        Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "     ?????? File not found: $sourcePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 4: Verifying file permissions..." -ForegroundColor Yellow
try {
    ssh "${PiUser}@${PiIP}" 'chmod 644 /home/${USER}/rfid_tracker/.env 2>/dev/null || true'
    ssh "${PiUser}@${PiIP}" 'chmod 644 /home/${USER}/rfid_tracker/config.py 2>/dev/null || true'
    ssh "${PiUser}@${PiIP}" 'chmod 644 /home/${USER}/rfid_tracker/app/utils/helpers.py 2>/dev/null || true'
    ssh "${PiUser}@${PiIP}" 'chmod 644 /home/${USER}/rfid_tracker/app/services/tracking_service.py 2>/dev/null || true'
    Write-Host "  ??? Permissions set" -ForegroundColor Green
} catch {
    Write-Host "  ?????? Could not set permissions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Transfer Complete!" -ForegroundColor Green
Write-Host "Files transferred: $transferCount" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "???? Updated Files Summary:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1??????  config.py" -ForegroundColor White
Write-Host "      ??? Added DISPATCHER_URL configuration" -ForegroundColor Gray
Write-Host ""
Write-Host "  2??????  app/utils/helpers.py" -ForegroundColor White
Write-Host "      ??? Added get_mac_address() function" -ForegroundColor Gray
Write-Host "      ??? Added convert_to_iso_format() function" -ForegroundColor Gray
Write-Host "      ??? Added send_to_dispatcher() function" -ForegroundColor Gray
Write-Host ""
Write-Host "  3??????  app/services/tracking_service.py" -ForegroundColor White
Write-Host "      ??? Added _check_and_send_to_dispatcher() method" -ForegroundColor Gray
Write-Host "      ??? Added pair tracking logic" -ForegroundColor Gray
Write-Host "      ??? Auto-sends to dispatcher when pairs detected" -ForegroundColor Gray
Write-Host ""
Write-Host "  4??????  .env" -ForegroundColor White
Write-Host "      ??? Added DISPATCHER_URL=http://138.68.255.116:8080/items" -ForegroundColor Gray
Write-Host ""

Write-Host "???? What this integration does:" -ForegroundColor Cyan
Write-Host "  ??? Monitors RFID tag movements (IN/OUT pairs)" -ForegroundColor White
Write-Host "  ??? Sends POST to dispatcher when pairs form" -ForegroundColor White
Write-Host "  ??? Only sends latest pair with newer timestamp" -ForegroundColor White
Write-Host "  ??? Tracks multiple tags independently" -ForegroundColor White
Write-Host "  ??? Non-blocking background POST requests" -ForegroundColor White
Write-Host ""

Write-Host "???? Dispatcher Endpoint:" -ForegroundColor Cyan
Write-Host "  http://138.68.255.116:8080/items" -ForegroundColor Gray
Write-Host ""
Write-Host "???? POST Payload Format:" -ForegroundColor Cyan
Write-Host '  {' -ForegroundColor Gray
Write-Host '    "tagId": "E2001234567890123456",' -ForegroundColor Gray
Write-Host '    "macAddress": "B8:27:EB:12:34:56",' -ForegroundColor Gray
Write-Host '    "direction": "IN",' -ForegroundColor Gray
Write-Host '    "readDate": "2025-12-06T15:45:23"' -ForegroundColor Gray
Write-Host '  }' -ForegroundColor Gray
Write-Host ""

Write-Host "??? Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH into your Raspberry Pi Zero 2W:" -ForegroundColor White
Write-Host "   ssh ${PiUser}@${PiIP}" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Verify the files are in place:" -ForegroundColor White
Write-Host "   ls -la ~/rfid_tracker/config.py" -ForegroundColor Yellow
Write-Host "   ls -la ~/rfid_tracker/.env" -ForegroundColor Yellow
Write-Host "   ls -la ~/rfid_tracker/app/utils/helpers.py" -ForegroundColor Yellow
Write-Host "   ls -la ~/rfid_tracker/app/services/tracking_service.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Restart the RFID tracker service:" -ForegroundColor White
Write-Host "   sudo systemctl restart rfid-tracker" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Check service status:" -ForegroundColor White
Write-Host "   sudo systemctl status rfid-tracker" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Monitor the logs for dispatcher activity:" -ForegroundColor White
Write-Host "   sudo journalctl -u rfid-tracker -f | grep -i dispatcher" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Test the integration by reading an RFID tag twice (IN then OUT)" -ForegroundColor White
Write-Host "   Watch for log messages like:" -ForegroundColor Gray
Write-Host "   '??? Tag TAG-001 has 1 pair(s). Sending LATEST pair: OUT at 2025-12-06-03-45-23-456-PM'" -ForegroundColor Gray
Write-Host ""

# Offer to SSH immediately
$sshNow = Read-Host "Would you like to SSH into the Raspberry Pi now? (y/n)"
if ($sshNow -eq 'y') {
    Write-Host ""
    Write-Host "Connecting to ${PiUser}@${PiIP}..." -ForegroundColor Yellow
    Write-Host ""
    ssh "${PiUser}@${PiIP}"
}
