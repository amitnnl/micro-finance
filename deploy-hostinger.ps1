# ======================================================================
# Kaspr Microfinance - Hostinger Direct FTP Automated Deployment
# ======================================================================

param (
    [string]$FtpHost = "",
    [string]$FtpUser = "",
    [string]$FtpPass = "",
    [string]$RemoteDir = "/public_html/micro"
)

$ErrorActionPreference = "Stop"
$projectRoot = "C:\xampp\htdocs\micro-fin"
$zipFile = Join-Path $projectRoot "hostinger-deploy.zip"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       KASPR MICROFINANCE -> HOSTINGER DEPLOYER           " -ForegroundColor Cyan
Write-Host " Target Domain: https://micro.kasprgroup.in/             " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Ensure fresh zip file exists
Write-Host ">>> Packaging latest production build..." -ForegroundColor Yellow
& "$projectRoot\package-hostinger.ps1"

# Step 2: Prompt for Hostinger FTP Credentials if not passed as arguments
if ([string]::IsNullOrWhiteSpace($FtpHost)) {
    Write-Host "`nPlease find your FTP details in Hostinger hPanel -> Files -> FTP Accounts" -ForegroundColor DarkGray
    $FtpHost = Read-Host "Enter Hostinger FTP Host (e.g., ftp.kasprgroup.in or your Hostinger server IP)"
}

if ([string]::IsNullOrWhiteSpace($FtpUser)) {
    $FtpUser = Read-Host "Enter Hostinger FTP Username (e.g., u123456789)"
}

if ([string]::IsNullOrWhiteSpace($FtpPass)) {
    $FtpPass = Read-Host -AsSecureString "Enter Hostinger FTP Password"
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($FtpPass)
    $FtpPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if ([string]::IsNullOrWhiteSpace($RemoteDir)) {
    $RemoteDir = Read-Host "Enter Remote Subdomain Directory (default: /public_html/micro)"
    if ([string]::IsNullOrWhiteSpace($RemoteDir)) {
        $RemoteDir = "/public_html/micro"
    }
}

if ([string]::IsNullOrWhiteSpace($FtpHost) -or [string]::IsNullOrWhiteSpace($FtpUser)) {
    Write-Host "`nError: FTP Host and Username are required to deploy." -ForegroundColor Red
    exit 1
}

# Clean FTP Host formatting
$FtpHost = $FtpHost.Trim().Replace("ftp://", "").Replace("http://", "").Replace("https://", "").TrimEnd('/')

Write-Host "`n>>> Connecting to Hostinger FTP ($FtpHost)..." -ForegroundColor Cyan

try {
    # Test FTP Connection and upload zip package
    $ftpUri = "ftp://$FtpHost/$RemoteDir/hostinger-deploy.zip"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)

    Write-Host ">>> Uploading hostinger-deploy.zip ($([math]::Round((Get-Item $zipFile).Length / 1MB, 2)) MB) to $RemoteDir..." -ForegroundColor Cyan
    $webclient.UploadFile($ftpUri, $zipFile)

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "SUCCESSFULLY UPLOADED TO HOSTINGER!" -ForegroundColor Green
    Write-Host "File uploaded: $RemoteDir/hostinger-deploy.zip" -ForegroundColor Yellow
    Write-Host "`nFinal 2 steps in Hostinger hPanel:" -ForegroundColor Cyan
    Write-Host "1. In Hostinger hPanel -> File Manager -> Navigate to '$RemoteDir':" -ForegroundColor White
    Write-Host "   Right-click 'hostinger-deploy.zip' and click 'Extract'." -ForegroundColor White
    Write-Host "2. If updating database schema:" -ForegroundColor White
    Write-Host "   In hPanel -> Databases -> phpMyAdmin, import 'database/database.sql' (or run backend/migrate.php)" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "`nFTP Upload Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nAlternative 30-Second Manual Upload via Hostinger File Manager:" -ForegroundColor Yellow
    Write-Host "1. Open Hostinger hPanel -> File Manager -> Navigate to '$RemoteDir'" -ForegroundColor White
    Write-Host "2. Click 'Upload' and select: $zipFile" -ForegroundColor White
    Write-Host "3. Right-click 'hostinger-deploy.zip' and click 'Extract'" -ForegroundColor White
}
