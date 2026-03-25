#!/bin/bash
# ============================================================================
# verify-gitignore.sh - Vérifiez que .gitignore est correctement configuré
# ============================================================================
# Usage: bash verify-gitignore.sh

echo "=================================================="
echo "✓ Vérification de la Configuration Git"
echo "=================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
ERROR_COUNT=0
SUCCESS_COUNT=0

# Fonction pour afficher les résultats
check_file() {
    local file=$1
    local should_ignore=$2
    
    if git check-ignore -q "$file" 2>/dev/null; then
        if [ "$should_ignore" = true ]; then
            echo -e "${GREEN}✓${NC} $file est correctement ignoré"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}✗${NC} $file est ignoré mais NE DEVRAIT PAS l'être"
            ((ERROR_COUNT++))
        fi
    else
        if [ "$should_ignore" = false ]; then
            echo -e "${GREEN}✓${NC} $file est correctement suivi"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}✗${NC} $file NE DEVRAIT PAS être ignoré"
            ((ERROR_COUNT++))
        fi
    fi
}

echo "1. Vérification des fichiers qui DOIVENT être ignorés:"
echo "---"

# Fichiers sensibles
check_file ".env" true
check_file ".env.local" true
check_file ".env.prod" true

echo ""
echo "2. Dépendances à ignorer:"
echo "---"

check_file "residanat-frontend-main/node_modules" true
check_file "BACKEND/residanat-backend-auth-service-main/target" true
check_file "test-IA-residanat/venv" true

echo ""
echo "3. Artifacts de build à ignorer:"
echo "---"

check_file "BACKEND/residanat-backend-auth-service-main/build_log.txt" true
check_file "BACKEND/residanat-backend-auth-service-main/app.jar" true
check_file "residanat-frontend-main/dist" true

echo ""
echo "4. Fichiers IDE à ignorer:"
echo "---"

check_file ".vscode" true
check_file ".idea" true

echo ""
echo "5. Fichiers qui DOIVENT être suivis:"
echo "---"

check_file ".gitignore" false
check_file ".env.example" false
check_file "docker-compose.yml" false
check_file "pom.xml" false
check_file "package.json" false
check_file "README.md" false

echo ""
echo "=================================================="
echo "Résumé:"
echo "=================================================="
echo -e "${GREEN}✓ Succès: $SUCCESS_COUNT${NC}"
echo -e "${RED}✗ Erreurs: $ERROR_COUNT${NC}"
echo ""

# Vérification spéciale: fichiers sensibles en staging
echo "6. Vérification de fichiers sensibles en STAGING:"
echo "---"

SENSITIVE_FILES=(".env" ".env.local" ".env.*.local")

for pattern in "${SENSITIVE_FILES[@]}"; do
    if git ls-files "$pattern" 2>/dev/null | grep -q .; then
        echo -e "${RED}✗ DANGER: $pattern est en staging!${NC}"
        echo "  Exécutez: git rm --cached \"$pattern\""
        ((ERROR_COUNT++))
    else
        echo -e "${GREEN}✓${NC} $pattern n'est pas en staging"
        ((SUCCESS_COUNT++))
    fi
done

echo ""
echo "7. Vérification de dépendances en staging:"
echo "---"

HEAVY_DIRS=("node_modules" "target" "venv" "dist" "build")

for dir in "${HEAVY_DIRS[@]}"; do
    if git ls-files | grep -q "$dir/"; then
        echo -e "${RED}✗ DANGER: $dir/ contient des fichiers en staging!${NC}"
        ((ERROR_COUNT++))
    else
        echo -e "${GREEN}✓${NC} $dir/ n'est pas en staging"
        ((SUCCESS_COUNT++))
    fi
done

echo ""
echo "=================================================="

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Tout est correct! Vous pouvez pousser vos changements.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERROR_COUNT erreur(s) détectée(s). Veuillez les corriger.${NC}"
    exit 1
fi
