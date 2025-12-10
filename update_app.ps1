# Quick update script - Transfer only app.py to Raspberry Pi
# Usage: .\update_app.ps1 <raspberry_pi_ip>

param(
    [Parameter(Mandatory=$true)]
    [string]$PiIP,
    
    [Parameter(Mandatory=$false)]
    [string]$PiUser = "raspberry"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Quick Update - app.py only" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$SourceFile = "C:\TagEase_Inventory_V94 - Copy\rfid_tracker\app.py"

if (-not (Test-Path $SourceFile)) {
    Write-Host "Error: Source file not found: $SourceFile" -ForegroundColor Red
    exit 1
}

Write-Host "Transferring app.py to ${PiUser}@${PiIP}..." -ForegroundColor Yellow

try {
    scp $SourceFile "${PiUser}@${PiIP}:/home/${PiUser}/rfid_tracker/"
    Write-Host ""
    Write-Host "Successfully transferred app.py" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now restart the service on the Pi:" -ForegroundColor Cyan
    Write-Host "  ssh ${PiUser}@${PiIP}" -ForegroundColor Gray
    Write-Host "  sudo systemctl restart rfid-tracker.service" -ForegroundColor Gray
    Write-Host "  journalctl -f -u rfid-tracker.service" -ForegroundColor Gray
    Write-Host ""
    
    $restart = Read-Host "Would you like to SSH and restart the service now? (y/n)"
    if ($restart -eq 'y') {
        Write-Host ""
        Write-Host "Connecting to ${PiUser}@${PiIP}..." -ForegroundColor Yellow
        Write-Host "After login, run: sudo systemctl restart rfid-tracker.service" -ForegroundColor Yellow
        ssh "${PiUser}@${PiIP}"
    }
    
} catch {
    Write-Host ""
    Write-Host "Failed to transfer app.py" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
