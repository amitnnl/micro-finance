# ======================================================================
# Kaspr Microfinance - Hostinger One-Click Production Packager
# ======================================================================

$ErrorActionPreference = "Stop"

$projectRoot = "C:\xampp\htdocs\micro-fin"
$zipFile = Join-Path $projectRoot "hostinger-deploy.zip"
$staging = Join-Path $projectRoot "hostinger-staging"

Write-Host ">>> [1/5] Compiling fresh React frontend build..." -ForegroundColor Cyan
Set-Location (Join-Path $projectRoot "frontend")
npm run build
Set-Location $projectRoot

Write-Host ">>> [2/5] Syncing fresh frontend assets into root..." -ForegroundColor Cyan
# Sync frontend/dist/index.html to root
Copy-Item (Join-Path $projectRoot "frontend\dist\index.html") -Destination (Join-Path $projectRoot "index.html") -Force

# Clean old assets in root assets folder and copy latest compiled assets
$rootAssets = Join-Path $projectRoot "assets"
if (Test-Path $rootAssets) {
    Remove-Item (Join-Path $rootAssets "*") -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $rootAssets | Out-Null
}
Copy-Item (Join-Path $projectRoot "frontend\dist\assets\*") -Destination $rootAssets -Recurse -Force

Write-Host ">>> [3/5] Preparing clean staging directory..." -ForegroundColor Cyan
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}
if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host ">>> [4/5] Copying production assets and backend files..." -ForegroundColor Cyan

# Copy core files
Copy-Item (Join-Path $projectRoot ".htaccess") -Destination $staging
Copy-Item (Join-Path $projectRoot "index.php") -Destination $staging
Copy-Item (Join-Path $projectRoot "index.html") -Destination $staging
Copy-Item (Join-Path $projectRoot ".env.example") -Destination $staging
Copy-Item (Join-Path $projectRoot "favicon.svg") -Destination $staging

# Copy static assets and frontend dist
Copy-Item (Join-Path $projectRoot "assets") -Destination $staging -Recurse
$stagingDist = Join-Path $staging "frontend\dist"
New-Item -ItemType Directory -Path $stagingDist | Out-Null
Copy-Item (Join-Path $projectRoot "frontend\dist\*") -Destination $stagingDist -Recurse

# Copy clean backend without SQLite or logs
$backendDest = Join-Path $staging "backend"
New-Item -ItemType Directory -Path $backendDest | Out-Null
Copy-Item (Join-Path $projectRoot "backend\.htaccess") -Destination $backendDest
Copy-Item (Join-Path $projectRoot "backend\api") -Destination $backendDest -Recurse
Copy-Item (Join-Path $projectRoot "backend\config") -Destination $backendDest -Recurse
Copy-Item (Join-Path $projectRoot "backend\controllers") -Destination $backendDest -Recurse
Copy-Item (Join-Path $projectRoot "backend\helpers") -Destination $backendDest -Recurse
Copy-Item (Join-Path $projectRoot "backend\models") -Destination $backendDest -Recurse
Copy-Item (Join-Path $projectRoot "backend\migrate.php") -Destination $backendDest

# Copy clean database schema
$dbDest = Join-Path $staging "database"
New-Item -ItemType Directory -Path $dbDest | Out-Null
Copy-Item (Join-Path $projectRoot "database\database.sql") -Destination $dbDest

Write-Host ">>> [5/5] Compressing into hostinger-deploy.zip..." -ForegroundColor Cyan
Compress-Archive -Path "$staging\*" -DestinationPath $zipFile -Force

Remove-Item $staging -Recurse -Force

$zipInfo = Get-Item $zipFile
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "SUCCESS! Fresh Hostinger Production ZIP Created:" -ForegroundColor Green
Write-Host "Path: $($zipInfo.FullName)" -ForegroundColor Yellow
Write-Host "Size: $sizeMB MB" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
