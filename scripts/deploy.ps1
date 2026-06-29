param(
    [string]$SshHost = "qc_vm",
    [string]$SshConfig = "C:\Users\QC\.ssh\config",
    [string]$Domain = "crm.daraljamalclinic.com",
    [string]$ApiProject = "be\Crm.Api\Crm.Api.csproj",
    [string]$FrontendDir = "fe",
    [string]$AppName = "crm-api",
    [string]$ApiPort = "5090",
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$tmpDir = Join-Path $repoRoot "tmp\deploy"
$apiPublishDir = Join-Path $tmpDir "crm-api"
$apiArchive = Join-Path $tmpDir "crm-api.tar.gz"
$feArchive = Join-Path $tmpDir "crm-fe.tar.gz"
$remoteScriptPath = Join-Path $tmpDir "remote-deploy.sh"
$frontendPath = Join-Path $repoRoot $FrontendDir
$frontendDistPath = Join-Path $frontendPath "dist"

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
if (Test-Path $apiPublishDir) {
    Remove-Item -Recurse -Force $apiPublishDir
}

if (-not $SkipBuild) {
    if (-not $SkipInstall) {
        Push-Location $frontendPath
        npm ci
        Pop-Location
    }

    Push-Location $frontendPath
    $env:VITE_API_BASE_URL = "https://$Domain"
    npm run build
    Pop-Location

    dotnet publish (Join-Path $repoRoot $ApiProject) `
        -c Release `
        -r linux-x64 `
        --self-contained true `
        -p:PublishSingleFile=true `
        -o $apiPublishDir
}

if (Test-Path $apiArchive) {
    Remove-Item -Force $apiArchive
}
if (Test-Path $feArchive) {
    Remove-Item -Force $feArchive
}

tar -czf $apiArchive -C $apiPublishDir .
tar -czf $feArchive -C $frontendDistPath .

$remoteScript = @"
set -euo pipefail

DOMAIN="$Domain"
APP_NAME="$AppName"
APP_PORT="$ApiPort"
SITE_ROOT="/home/`${DOMAIN}"
WEB_ROOT="`${SITE_ROOT}/public_html"
APP_ROOT="/opt/`${APP_NAME}"
RELEASE="`$(date +%Y%m%d%H%M%S)"
SITE_USER="`$(stat -c '%U' "`$WEB_ROOT")"

mkdir -p "`${APP_ROOT}/releases/`${RELEASE}"
tar -xzf /tmp/`${APP_NAME}.tar.gz -C "`${APP_ROOT}/releases/`${RELEASE}"
chmod +x "`${APP_ROOT}/releases/`${RELEASE}/Crm.Api"
ln -sfn "`${APP_ROOT}/releases/`${RELEASE}" "`${APP_ROOT}/current"
chown -R "`${SITE_USER}:`${SITE_USER}" "`$APP_ROOT"

rm -rf "`${WEB_ROOT:?}"/*
tar -xzf /tmp/crm-fe.tar.gz -C "`$WEB_ROOT"
cat > "`${WEB_ROOT}/.htaccess" <<'HTACCESS'
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
HTACCESS
chown -R "`${SITE_USER}:nogroup" "`$WEB_ROOT"
find "`$WEB_ROOT" -type d -exec chmod 750 {} \;
find "`$WEB_ROOT" -type f -exec chmod 640 {} \;

systemctl restart "`$APP_NAME"
for attempt in `$(seq 1 30); do
    if systemctl is-active --quiet "`$APP_NAME" && curl -fsS "http://127.0.0.1:`${APP_PORT}/health" 2>/dev/null; then
        exit 0
    fi

    sleep 1
done

systemctl --no-pager --full status "`$APP_NAME" || true
journalctl -u "`$APP_NAME" -n 80 --no-pager || true
exit 1
"@

[System.IO.File]::WriteAllText($remoteScriptPath, $remoteScript.Replace("`r`n", "`n"))

scp -F $SshConfig $apiArchive "${SshHost}:/tmp/${AppName}.tar.gz"
scp -F $SshConfig $feArchive "${SshHost}:/tmp/crm-fe.tar.gz"
scp -F $SshConfig $remoteScriptPath "${SshHost}:/tmp/${AppName}-deploy.sh"
ssh -F $SshConfig $SshHost "bash /tmp/${AppName}-deploy.sh"

Write-Host "Deployed https://$Domain"
