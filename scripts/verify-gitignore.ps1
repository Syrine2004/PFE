@echo off
REM ============================================================================
REM verify-gitignore.ps1 - Vérifiez que .gitignore est correctement configuré
REM ============================================================================
REM Usage: powershell -ExecutionPolicy Bypass -File verify-gitignore.ps1

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✓ Vérification de la Configuration Git" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

function Test-GitIgnore {
    param(
        [string]$FilePath,
        [bool]$ShouldIgnore
    )
    
    $result = git check-ignore -q $FilePath 2>$null
    $isIgnored = $LASTEXITCODE -eq 0
    
    if ($isIgnored -eq $ShouldIgnore) {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        if ($ShouldIgnore) {
            Write-Host "$FilePath est correctement ignoré"
        } else {
            Write-Host "$FilePath est correctement suivi"
        }
        $script:SuccessCount++
    } else {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        if ($ShouldIgnore) {
            Write-Host "$FilePath NE DEVRAIT PAS être ignoré"
        } else {
            Write-Host "$FilePath DEVRAIT être ignoré"
        }
        $script:ErrorCount++
    }
}

# Section 1: Fichiers sensibles
Write-Host "1. Vérification des fichiers qui DOIVENT être ignorés:" -ForegroundColor Yellow
Write-Host "---"
Test-GitIgnore ".env" $true
Test-GitIgnore ".env.local" $true
Test-GitIgnore ".env.prod" $true

# Section 2: Dépendances
Write-Host ""
Write-Host "2. Dépendances à ignorer:" -ForegroundColor Yellow
Write-Host "---"
Test-GitIgnore "residanat-frontend-main/node_modules" $true
Test-GitIgnore "BACKEND/residanat-backend-auth-service-main/target" $true
Test-GitIgnore "test-IA-residanat/venv" $true

# Section 3: Artifacts de build
Write-Host ""
Write-Host "3. Artifacts de build à ignorer:" -ForegroundColor Yellow
Write-Host "---"
Test-GitIgnore "BACKEND/residanat-backend-auth-service-main/build_log.txt" $true
Test-GitIgnore "BACKEND/residanat-backend-auth-service-main/app.jar" $true
Test-GitIgnore "residanat-frontend-main/dist" $true

# Section 4: Fichiers IDE
Write-Host ""
Write-Host "4. Fichiers IDE à ignorer:" -ForegroundColor Yellow
Write-Host "---"
Test-GitIgnore ".vscode" $true
Test-GitIgnore ".idea" $true

# Section 5: Fichiers à suivre
Write-Host ""
Write-Host "5. Fichiers qui DOIVENT être suivis:" -ForegroundColor Yellow
Write-Host "---"
Test-GitIgnore ".gitignore" $false
Test-GitIgnore ".env.example" $false
Test-GitIgnore "docker-compose.yml" $false
Test-GitIgnore "pom.xml" $false
Test-GitIgnore "package.json" $false
Test-GitIgnore "README.md" $false

# Section 6: Fichiers sensibles en staging
Write-Host ""
Write-Host "6. Vérification de fichiers sensibles en STAGING:" -ForegroundColor Yellow
Write-Host "---"

$SensitiveFiles = @(".env", ".env.local")

foreach ($file in $SensitiveFiles) {
    $stagedFiles = git ls-files $file 2>$null
    if ($stagedFiles) {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        Write-Host "DANGER: $file est en staging!"
        Write-Host "  Exécutez: git rm --cached `"$file`"" -ForegroundColor Red
        $script:ErrorCount++
    } else {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$file n'est pas en staging"
        $script:SuccessCount++
    }
}

# Section 7: Dépendances en staging
Write-Host ""
Write-Host "7. Vérification de dépendances en staging:" -ForegroundColor Yellow
Write-Host "---"

$HeavyDirs = @("node_modules", "target", "venv", "dist", "build")

foreach ($dir in $HeavyDirs) {
    $stagedDirs = git ls-files | Select-String $dir
    if ($stagedDirs) {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        Write-Host "DANGER: $dir/ contient des fichiers en staging!"
        $script:ErrorCount++
    } else {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$dir/ n'est pas en staging"
        $script:SuccessCount++
    }
}

# Résumé
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "✓ Succès: " -ForegroundColor Green -NoNewline
Write-Host $SuccessCount

Write-Host "✗ Erreurs: " -ForegroundColor Red -NoNewline
Write-Host $ErrorCount

Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "✓ Tout est correct! Vous pouvez pousser vos changements." -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ $ErrorCount erreur(s) détectée(s). Veuillez les corriger." -ForegroundColor Red
    exit 1
}
