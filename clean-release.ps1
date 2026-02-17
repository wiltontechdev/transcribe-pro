# PowerShell script to forcefully clean the release folder
$releasePath = "release"

# Kill any running Electron/Transcribe Pro processes
Write-Host "Checking for running Electron processes..."
Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*Transcribe*" } | ForEach-Object {
    Write-Host "Stopping process: $($_.ProcessName) (PID: $($_.Id))"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Wait a moment for processes to fully terminate
Start-Sleep -Milliseconds 1000

if (Test-Path $releasePath) {
    Write-Host "Attempting to remove release folder..."
    
    # Try to remove with force, ignoring errors
    Get-ChildItem -Path $releasePath -Recurse -Force | ForEach-Object {
        try {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignore errors for locked files
        }
    }
    
    # Wait a moment for file handles to release
    Start-Sleep -Milliseconds 500
    
    # Try to remove the directory itself
    try {
        Remove-Item -Path $releasePath -Recurse -Force -ErrorAction Stop
        Write-Host "Release folder cleaned successfully"
    } catch {
        Write-Host "Warning: Some files may still be locked. Please close any running Electron apps and File Explorer windows."
        Write-Host "You may need to manually delete the 'release' folder and try again."
        exit 1
    }
} else {
    Write-Host "Release folder does not exist - nothing to clean"
}
