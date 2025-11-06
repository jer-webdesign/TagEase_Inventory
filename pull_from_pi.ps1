# Pull (download) app.py from Raspberry Pi to Windows
# Usage: .\pull_from_pi.ps1 <raspberry_pi_ip>

param(
    [Parameter(Mandatory=$false)]
    [string]$PiIP = "192.168.182.23",
    
    [Parameter(Mandatory=$false)]
    [string]$PiUser = "raspberry"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Pull app.py from Raspberry Pi" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$DestFile = "C:\TagEase_Inventory_V93\rfid_tracker\app.py"

Write-Host "Downloading from ${PiUser}@${PiIP}..." -ForegroundColor Yellow

try {
    scp "${PiUser}@${PiIP}:/home/${PiUser}/rfid_tracker/app.py" $DestFile
    Write-Host ""
    Write-Host "Successfully downloaded app.py" -ForegroundColor Green
    Write-Host "Saved to: $DestFile" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "Failed to download app.py" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
