# FULL RESET for end-to-end testing (Windows). Removes:
#   - the hackathon workspace (~\aml-hackathon — includes the portable node + git we install)
#   - any globally-installed Claude Code
#   - machine-wide Node.js and Git for Windows
# ...so the next setup runs as if on a brand-new machine.
#
# WARNING: this uninstalls your PERSONAL Node.js and Git. You'll reinstall them if you use
# them outside this hackathon. It never touches your ~\.claude config.
#
# Usage: irm https://raw.githubusercontent.com/rohan-richard/aml-hackathon/main/nuke.ps1 | iex
$ErrorActionPreference = 'SilentlyContinue'

$HomeDir = Join-Path $env:USERPROFILE 'aml-hackathon'

Write-Host "`n> NUKE: workspace + Claude Code + Node + Git (fresh-start reset)..." -ForegroundColor Magenta

# 1. Stop + remove the workspace (removes the PORTABLE node/git we install).
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*aml-hackathon*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 1
Remove-Item -Recurse -Force $HomeDir
Write-Host "  [ok] Removed workspace ($HomeDir)" -ForegroundColor Green

# 2. Globally-installed Claude Code (leftover from older setups).
Remove-Item -Recurse -Force "$env:USERPROFILE\.local\bin\claude.exe", "$env:USERPROFILE\.local\share\claude"
Write-Host "  [ok] Removed globally-installed Claude Code" -ForegroundColor Green

# 3. Git for Windows — use its own silent uninstaller.
$gitUnins = "$env:ProgramFiles\Git\unins000.exe"
if (Test-Path $gitUnins) {
  Write-Host "  Uninstalling Git for Windows..."
  Start-Process -FilePath $gitUnins -ArgumentList '/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES' -Wait
  Write-Host "  [ok] Removed Git for Windows" -ForegroundColor Green
}

# 4. Node.js (and any remaining Git) via winget — the clean, installer-aware way.
if (Get-Command winget -ErrorAction SilentlyContinue) {
  foreach ($id in @('OpenJS.NodeJS','OpenJS.NodeJS.LTS','Git.Git')) {
    winget uninstall --id $id -e --silent --accept-source-agreements --disable-interactivity 2>$null | Out-Null
  }
  Write-Host "  [ok] Ran winget uninstall for Node.js / Git" -ForegroundColor Green
} else {
  Write-Host "  (winget not found — if Node.js remains, uninstall it from Settings > Apps)"
}

Write-Host "`n  Left intact: your ~\.claude config." -ForegroundColor Green
Write-Host "  Open a NEW PowerShell window before re-running setup so PATH refreshes."
