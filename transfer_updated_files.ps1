# ========================================
# RFID Tracker - Transfer Updated Files to Raspberry Pi
# ========================================
# This script transfers only the files modified during the configuration session
# Usage: .\transfer_updated_files.ps1 <raspberry_pi_ip>

param(
    [Parameter(Mandatory=$true)]
    [string]$PiIP,
    
    [Parameter(Mandatory=$false)]
    [string]$PiUser = "raspberry"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "RFID Tracker - Transfer Updated Files" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$SourceDir = "C:\TagEase_Inventory_V94"

# List of specific files that were modified
$UpdatedFiles = @(
    "rfid_tracker\app\services\rfid_service.py",
    "rfid_tracker\app\services\sensor_service.py", 
    "rfid_tracker\app\routes\websocket_events.py",
    "rfid_tracker\config.py"
)

Write-Host "Source Directory: $SourceDir" -ForegroundColor Cyan
Write-Host "Destination: ${PiUser}@${PiIP}:/home/${PiUser}/" -ForegroundColor Cyan
Write-Host ""

# Check if scp is available
try {
    scp 2>&1 | Out-Null
} catch {
    Write-Host "Error: scp command not found. Please install OpenSSH Client." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Testing connection to Raspberry Pi..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $PiIP -Count 1 -Quiet

if (-not $pingResult) {
    Write-Host "Warning: Cannot ping $PiIP. The Pi might be offline." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Transfer cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Transferring updated backend files..." -ForegroundColor Yellow

$transferCount = 0
foreach ($file in $UpdatedFiles) {
    $sourcePath = Join-Path $SourceDir $file
    $fileName = Split-Path $file -Leaf
    $relativePath = $file -replace '\\', '/'
    
    if (Test-Path $sourcePath) {
        try {
            Write-Host "  Transferring $fileName..." -ForegroundColor Gray
            
            # Create directory structure on Pi if needed
            $remoteDir = "rfid_tracker/" + ($file -replace '\\[^\\]*$', '' -replace '\\', '/')
            ssh "${PiUser}@${PiIP}" "mkdir -p /home/${PiUser}/$remoteDir" 2>$null
            
            # Transfer the file
            scp "$sourcePath" "${PiUser}@${PiIP}:/home/${PiUser}/$relativePath"
            Write-Host "    ✅ $fileName transferred successfully" -ForegroundColor Green
            $transferCount++
        } catch {
            Write-Host "    ❌ Failed to transfer $fileName" -ForegroundColor Red
            Write-Host "       Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "    ⚠️ File not found: $sourcePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 3: Checking for .env file..." -ForegroundColor Yellow
$envPath = Join-Path $SourceDir "rfid_tracker\.env"
if (Test-Path $envPath) {
    try {
        Write-Host "  Transferring .env file..." -ForegroundColor Gray
        scp "$envPath" "${PiUser}@${PiIP}:/home/${PiUser}/rfid_tracker/.env"
        Write-Host "    ✅ .env file transferred successfully" -ForegroundColor Green
        $transferCount++
    } catch {
        Write-Host "    ❌ Failed to transfer .env file" -ForegroundColor Red
    }
} else {
    Write-Host "    ℹ️ No .env file found (using config.py defaults)" -ForegroundColor Blue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Transfer Complete!" -ForegroundColor Green
Write-Host "Files transferred: $transferCount" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Updated Files Summary:" -ForegroundColor Cyan
Write-Host "  📡 rfid_service.py - Added RFID power control" -ForegroundColor White
Write-Host "  📏 sensor_service.py - Added sensor range control" -ForegroundColor White  
Write-Host "  🌐 websocket_events.py - Added configuration handlers" -ForegroundColor White
Write-Host "  ⚙️ config.py - Set default 2m sensor range" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. SSH into your Raspberry Pi:" -ForegroundColor White
Write-Host "   ssh ${PiUser}@${PiIP}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart the RFID tracker service:" -ForegroundColor White
Write-Host "   sudo systemctl restart rfid-tracker" -ForegroundColor Gray
Write-Host "   sudo systemctl status rfid-tracker" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check the logs:" -ForegroundColor White
Write-Host "   sudo journalctl -u rfid-tracker -f" -ForegroundColor Gray
Write-Host ""

# Offer to SSH immediately
$sshNow = Read-Host "Would you like to SSH into the Raspberry Pi now? (y/n)"
if ($sshNow -eq 'y') {
    Write-Host ""
    Write-Host "Connecting to ${PiUser}@${PiIP}..." -ForegroundColor Yellow
    ssh "${PiUser}@${PiIP}"
}