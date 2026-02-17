# Check if Developer Mode is enabled in Windows
Write-Host "Checking Windows Developer Mode status..." -ForegroundColor Cyan

$regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
$devMode = Get-ItemProperty -Path $regPath -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction SilentlyContinue

if ($devMode -and $devMode.AllowDevelopmentWithoutDevLicense -eq 1) {
    Write-Host "✓ Developer Mode is ENABLED" -ForegroundColor Green
    Write-Host "You can run code signing builds!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Developer Mode is DISABLED" -ForegroundColor Red
    Write-Host ""
    Write-Host "To enable Developer Mode:" -ForegroundColor Yellow
    Write-Host "1. Press Win + I to open Settings" -ForegroundColor Yellow
    Write-Host "2. Go to Privacy & Security → For developers" -ForegroundColor Yellow
    Write-Host "3. Toggle 'Developer Mode' to ON" -ForegroundColor Yellow
    Write-Host "4. Restart your computer if prompted" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run PowerShell as Administrator and try the build again." -ForegroundColor Yellow
    exit 1
}
