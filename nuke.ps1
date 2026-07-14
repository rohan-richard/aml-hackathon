# FULL RESET for end-to-end testing (Windows): removes the hackathon workspace AND any
# globally-installed Claude Code, so the next setup runs as if on a brand-new machine.
# Leaves your personal Claude config/history in ~\.claude untouched.
# Usage: irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.ps1 | iex
$ErrorActionPreference = 'SilentlyContinue'

$HomeDir = Join-Path $env:USERPROFILE 'aml-hackathon'

Write-Host "`n> Nuking hackathon workspace + Claude Code (fresh-start reset)..." -ForegroundColor Magenta

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*aml-hackathon*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 1

Remove-Item -Recurse -Force $HomeDir
# Leftover from older setups that installed Claude Code globally.
Remove-Item -Recurse -Force "$env:USERPROFILE\.local\bin\claude.exe", "$env:USERPROFILE\.local\share\claude"

Write-Host "  [ok] Removed $HomeDir" -ForegroundColor Green
Write-Host "  [ok] Removed globally-installed Claude Code (~\.local\bin\claude.exe, ~\.local\share\claude)" -ForegroundColor Green
Write-Host "  Your personal Claude settings/history in ~\.claude were left untouched."
Write-Host "  Now run setup.ps1 for a clean end-to-end test."
