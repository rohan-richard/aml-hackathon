# Removes the hackathon workspace on Windows.
# Usage: irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/uninstall.ps1 | iex
$ErrorActionPreference = 'SilentlyContinue'

$HomeDir = Join-Path $env:USERPROFILE 'aml-hackathon'

Write-Host "`n> Removing the hackathon workspace..." -ForegroundColor Magenta

# Stop node processes launched from the workspace, so their file locks don't block removal.
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*aml-hackathon*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 1

Remove-Item -Recurse -Force $HomeDir

Write-Host "  [ok] Removed $HomeDir" -ForegroundColor Green
Write-Host "  Claude Code itself was left in ~\.local\bin (it's shared). Remove it yourself if you want:"
Write-Host "    Remove-Item -Recurse -Force `"$env:USERPROFILE\.local\bin\claude.exe`", `"$env:USERPROFILE\.local\share\claude`""
