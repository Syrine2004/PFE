$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$envPath = Join-Path $repoRoot '.env'
$logPath = Join-Path $PSScriptRoot 'cloudflared-quick.log'
$errLogPath = Join-Path $PSScriptRoot 'cloudflared-quick.err.log'

Write-Host '==> Starting quick public tunnel for gateway (http://localhost:8080)...'

# Stop previous cloudflared process to avoid stale URLs.
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

if (Test-Path $logPath) {
    Remove-Item $logPath -Force
}
if (Test-Path $errLogPath) {
    Remove-Item $errLogPath -Force
}

$proc = Start-Process -FilePath "$repoRoot\cloudflared.exe" `
    -ArgumentList 'tunnel --url http://localhost:8080 --no-autoupdate' `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errLogPath `
    -WindowStyle Minimized `
    -PassThru

$url = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    $combined = ''
    if (Test-Path $logPath) {
        $outContent = Get-Content $logPath -Raw
        if ($null -ne $outContent) {
            $combined += $outContent
        }
    }
    if (Test-Path $errLogPath) {
        $errContent = Get-Content $errLogPath -Raw
        if ($null -ne $errContent) {
            $combined += "`n$errContent"
        }
    }

    if ($combined.Length -gt 0) {
        $match = [regex]::Match($combined, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) {
            $url = $match.Value
            break
        }
    }

    if ($proc.HasExited) {
        throw 'cloudflared exited unexpectedly. Check scripts/cloudflared-quick.log'
    }
}

if (-not $url) {
    throw 'Could not detect quick tunnel URL. Check scripts/cloudflared-quick.log'
}

$newBaseUrl = "$url/api/convocations/verifier"
Write-Host "==> Public URL: $newBaseUrl"

if (-not (Test-Path $envPath)) {
    throw '.env file not found at repository root.'
}

$envRaw = Get-Content $envPath -Raw
$envLines = @()
if ($null -ne $envRaw -and $envRaw.Length -gt 0) {
    $envLines = $envRaw -split "`r?`n"
}

# Remove all previous CONVOCATION_VERIFY_BASE_URL entries (including BOM-prefixed variants)
$envLines = $envLines | Where-Object { $_ -notmatch '^\uFEFF?\s*CONVOCATION_VERIFY_BASE_URL=' }
$envLines = $envLines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$envLines += "CONVOCATION_VERIFY_BASE_URL=$newBaseUrl"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envPath, ($envLines -join "`r`n") + "`r`n", $utf8NoBom)
Write-Host '==> Updated .env with current public verify URL.'

Write-Host '==> Restarting convocation-service to load new URL...'
docker compose up -d convocation-service | Out-Host

Write-Host '==> Waiting for convocation-service to become healthy...'
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $health = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" convocation-service 2>$null
    if ($health -eq 'healthy') {
        $healthy = $true
        break
    }
}

if (-not $healthy) {
    Write-Host '   Service not healthy yet; continuing anyway.'
}

Write-Host '==> Refreshing existing convocations so old PDFs get new QR links...'
$dossierIds = docker exec -i pfe_version-postgres-convocation-1 psql -U postgres -d residanat_convocation_db -At -c "select dossier_id from convocations order by dossier_id" 2>$null

if ($LASTEXITCODE -eq 0 -and $dossierIds) {
    foreach ($id in $dossierIds) {
        if ([string]::IsNullOrWhiteSpace($id)) { continue }
        $code = curl.exe -s -o NUL -w '%{http_code}' "http://localhost:8080/api/convocations/telecharger/$id"
        Write-Host "   dossier $id => HTTP $code"
    }
} else {
    Write-Host '   No convocations found (or DB not reachable right now).'
}

Write-Host ''
Write-Host 'DONE.'
Write-Host "Tunnel base URL: $url"
Write-Host "Verification base URL: $newBaseUrl"
Write-Host "cloudflared PID: $($proc.Id)"
Write-Host "Log file: $logPath"
Write-Host 'Keep cloudflared running for public access.'
