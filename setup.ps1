$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $NodeCommand -or -not $NpmCommand) {
    throw "Install Node.js 20 or newer and npm, then reopen PowerShell."
}

node --version
npm --version

Set-Location (Join-Path $ProjectRoot "backend")
npm install
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Set-Location (Join-Path $ProjectRoot "frontend")
npm install
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Set-Location $ProjectRoot
Write-Host "Setup complete. Configure MySQL and backend/.env, then run the backend and frontend dev scripts."
