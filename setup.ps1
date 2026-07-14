# One-command hackathon setup for Windows 11.
# Usage (what teams paste): irm <raw-url>/setup.ps1 | iex
$ErrorActionPreference = 'Stop'

$Repo        = 'rohan-richard/aml-hackathon'
$NodeVersion = '20.18.1'
$HomeDir     = Join-Path $env:USERPROFILE 'aml-hackathon'
$GitVersion  = '2.47.1'

function Say  ($m) { Write-Host "`n> $m" -ForegroundColor Magenta }
function OK   ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Die  ($m) { Write-Host "`n[x] $m" -ForegroundColor Red; Write-Host 'Take a screenshot of this window and send it to Rohan.'; exit 1 }

try {
  Say 'Setting up your hackathon workspace (this takes a few minutes)...'
  New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
  Set-Location $HomeDir

  # --- 1. Portable Node (pinned; no admin) ---
  $NodeDir = Join-Path $HomeDir ".node\node-v$NodeVersion-win-x64"
  $NodeExe = Join-Path $NodeDir 'node.exe'
  if (-not (Test-Path $NodeExe)) {
    Say "Installing a private copy of Node $NodeVersion..."
    $nodeZip = Join-Path $HomeDir 'node.zip'
    Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $nodeZip
    Expand-Archive -Path $nodeZip -DestinationPath (Join-Path $HomeDir '.node') -Force
    Remove-Item $nodeZip
  }
  $env:Path = "$NodeDir;$env:Path"
  OK "Node ready ($(& $NodeExe -v))"

  # --- 2. Portable Git (Claude Code needs Git Bash on Windows) ---
  $GitDir  = Join-Path $HomeDir 'PortableGit'
  $GitBash = Join-Path $GitDir 'bin\bash.exe'
  if (-not (Test-Path $GitBash)) {
    Say 'Installing a private copy of Git...'
    $gitExe = Join-Path $HomeDir 'git.7z.exe'
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v$GitVersion.windows.1/PortableGit-$GitVersion-64-bit.7z.exe"
    Invoke-WebRequest -UseBasicParsing $gitUrl -OutFile $gitExe
    Start-Process -FilePath $gitExe -ArgumentList "-o`"$GitDir`" -y" -Wait
    Remove-Item $gitExe
  }
  $env:CLAUDE_CODE_GIT_BASH_PATH = $GitBash
  OK 'Git ready'

  # --- 3. Claude Code CLI (no admin; native installer) ---
  Say 'Installing Claude Code...'
  try { irm https://claude.ai/install.ps1 | iex } catch { }
  $ClaudeBin = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
  if (-not (Test-Path $ClaudeBin)) { $ClaudeBin = (Get-Command claude -ErrorAction SilentlyContinue).Source }
  if (-not $ClaudeBin -or -not (Test-Path $ClaudeBin)) { Die 'Claude Code did not install. Bring the laptop to the helpers table.' }
  $env:CLAUDE_CLI_PATH = $ClaudeBin
  OK 'Claude Code ready'

  # --- 4. Download the app bundle ---
  Say 'Downloading the workspace...'
  $bundle = Join-Path $HomeDir 'bundle.tar.gz'
  Invoke-WebRequest -UseBasicParsing "https://github.com/$Repo/releases/latest/download/bundle.tar.gz" -OutFile $bundle
  & tar.exe -xzf $bundle -C $HomeDir
  Remove-Item $bundle
  OK 'Workspace downloaded'

  # --- 5. Install runtime dependencies (production only; prebuilt native modules) ---
  Say 'Installing components (the longest step)...'
  Push-Location (Join-Path $HomeDir 'ui')
  & (Join-Path $NodeDir 'npm.cmd') ci --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Pop-Location; Die 'Dependency install failed. Check the office wifi and re-run, or see a helper.' }
  Pop-Location
  Push-Location (Join-Path $HomeDir 'project')
  & (Join-Path $NodeDir 'npm.cmd') install --no-audit --no-fund
  Pop-Location
  OK 'Components installed'

  # --- 6. Launch ---
  Say 'Starting your workspace...'
  & $NodeExe (Join-Path $HomeDir 'setup\server.mjs')
}
catch { Die $_.Exception.Message }
