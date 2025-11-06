# ========================================
# RFID Tracker - Windows to Raspberry Pi Transfer Script
# ========================================
# This PowerShell script transfers the RFID tracker application
# from Windows to Raspberry Pi Zero 2W
#
# Usage: .\transfer_to_pi.ps1 <raspberry_pi_ip>
# Example: .\transfer_to_pi.ps1 192.168.1.100

param(
    [Parameter(Mandatory=$true)]
    [string]$PiIP,
    
    [Parameter(Mandatory=$false)]
    [string]$PiUser = "raspberry"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "RFID Tracker - Transfer to Raspberry Pi" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$SourceDir = "C:\TagEase_Inventory_V93"

# Check if source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "Error: Source directory not found: $SourceDir" -ForegroundColor Red
    exit 1
}

Write-Host "Source Directory: $SourceDir" -ForegroundColor Cyan
Write-Host "Destination: ${PiUser}@${PiIP}:/home/raspberry/" -ForegroundColor Cyan
Write-Host ""

# Check if scp is available
try {
    scp 2>&1 | Out-Null
} catch {
    Write-Host "Error: scp command not found. Please install OpenSSH Client." -ForegroundColor Red
    Write-Host "You can install it from: Settings > Apps > Optional Features > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Testing connection to Raspberry Pi..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $PiIP -Count 1 -Quiet

if (-not $pingResult) {
    Write-Host "Warning: Cannot ping $PiIP. The Pi might be offline or blocking ICMP." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Transfer cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Transferring rfid_tracker folder..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

try {
    scp -r "$SourceDir\rfid_tracker" "${PiUser}@${PiIP}:/home/raspberry/"
    Write-Host "✓ rfid_tracker folder transferred successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to transfer rfid_tracker folder" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Transferring app.py..." -ForegroundColor Yellow
try {
    scp "$SourceDir\app.py" "${PiUser}@${PiIP}:/home/raspberry/rfid_tracker/"
    Write-Host "✓ app.py transferred successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to transfer app.py" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 4: Transferring service file..." -ForegroundColor Yellow
try {
    scp "$SourceDir\rfid-tracker.service" "${PiUser}@${PiIP}:/home/raspberry/"
    Write-Host "✓ Service file transferred successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to transfer service file" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 5: Transferring deployment script..." -ForegroundColor Yellow
try {
    scp "$SourceDir\deploy_pi.sh" "${PiUser}@${PiIP}:/home/raspberry/"
    Write-Host "✓ Deployment script transferred successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to transfer deployment script" -ForegroundColor Red
}
Write-Host ""
Write-Host "Step 6: Transferring documentation..." -ForegroundColor Yellow
try {
    scp "$SourceDir\RASPBERRY_PI_DEPLOYMENT.md" "${PiUser}@${PiIP}:/home/raspberry/"
    scp "$SourceDir\SERVICE_QUICK_REFERENCE.md" "${PiUser}@${PiIP}:/home/raspberry/"
    scp "$SourceDir\WEBSOCKET_IMPLEMENTATION.md" "${PiUser}@${PiIP}:/home/raspberry/"
    Write-Host "✓ Documentation transferred successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to transfer documentation (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Transfer Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. SSH into your Raspberry Pi:" -ForegroundColor White
Write-Host "   ssh ${PiUser}@${PiIP}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the deployment script:" -ForegroundColor White
Write-Host "   chmod +x /home/raspberry/deploy_pi.sh" -ForegroundColor Gray
Write-Host "   sudo bash /home/raspberry/deploy_pi.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Update your frontend API_BASE_URL:" -ForegroundColor White
Write-Host "   const API_BASE_URL = 'http://${PiIP}:5000';" -ForegroundColor Gray
Write-Host ""

Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  - RASPBERRY_PI_DEPLOYMENT.md (on the Pi)" -ForegroundColor Gray
Write-Host "  - SERVICE_QUICK_REFERENCE.md (on the Pi)" -ForegroundColor Gray
Write-Host ""

# Offer to SSH immediately
$sshNow = Read-Host "Would you like to SSH into the Raspberry Pi now? (y/n)"
if ($sshNow -eq 'y') {
    Write-Host ""
    Write-Host "Connecting to ${PiUser}@${PiIP}..." -ForegroundColor Yellow
    ssh "${PiUser}@${PiIP}"
}