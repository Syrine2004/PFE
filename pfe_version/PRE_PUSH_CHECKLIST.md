# Pre-Push Checklist pour ResidanatTN

Avant de pousser vos changements vers le repository, utilisez cette checklist.

## ✅ Avant de Committer

### Sécurité & Secrets
- [ ] **Aucun `.env` commité** - Vérifiez `git status`
- [ ] **Pas de mots de passe** en plaintext dans le code
- [ ] **Pas de tokens API** ou clés privées
- [ ] **Pas de fichiers keys** (.pem, .p12, .jks)

### Fichiers Volumineux
- [ ] **Pas de `node_modules/`** - Devrait être ignoré par .gitignore
- [ ] **Pas de `target/`** ou `build/` - Maven/Gradle artifacts
- [ ] **Pas de `venv/` ou virtualenv** - Python environments
- [ ] **Pas de `dist/`** - Angular build outputs
- [ ] **Pas de logs** (*.log, *.out)

### Code Quality
- [ ] **Pas de `console.log()`** ou `System.out.println()` inutiles
- [ ] **Pas de code commenté** (à moins que ce soit une TODO valide)
- [ ] **Pas de fichiers de test IDE** (.vscode/*, .idea/*)
- [ ] **Pas de OS files** (.DS_Store, Thumbs.db)

## ✅ Avant de Pousser

### Tests
```bash
# Frontend
cd residanat-frontend-main
pnpm test:coverage --watch=false

# Backend (si modifié)
cd BACKEND/residanat-backend-auth-service-main
./mvnw test
```

- [ ] **Tous les tests passent** (frontend + backend)
- [ ] **Pas de warnings** en compilation

### Vérification Git
```bash
# Vérifiez vos changements
git diff --cached

# Vérifiez le .gitignore
bash scripts/verify-gitignore.sh  # Linux/Mac
powershell -File scripts/verify-gitignore.ps1  # Windows
```

- [ ] **Pas de fichiers sensibles** en staging
- [ ] **Pas de dépendances lourdes** (node_modules, target, venv)
- [ ] **Pas de logs ou artifacts** de build

### Messages de Commit
```bash
git log --oneline -5  # Vérifiez les 5 derniers commits
```

- [ ] **Messages clairs et descriptifs**
- [ ] **Format conventionnel**: `feat:`, `fix:`, `docs:`, etc.
- [ ] **Pas de messages vagues** comme "update" ou "fix"

Exemples de bons messages:
```
feat: ajouter validation IA pour les diplômes
fix: corriger la date de naissance dans le formulaire
docs: documenter la configuration Docker
refactor: restructurer le service d'authentification
```

### Code Review Personnel
- [ ] **Pas de format incohérent**
- [ ] **Indentation correcte** (2 espaces Angular, 4 Java)
- [ ] **Pas de code mort**
- [ ] **Documentation mise à jour** (README, CONTRIBUTING, etc)

## 🚨 Checklist de Sécurité ULTIME

AVANT de pousser, exécutez ceci:

```bash
# 1. Vérifiez qu'il n'y a pas de .env
git status | grep ".env"
# Résultat attendu: (rien)

# 2. Vérifiez qu'il n'y a pas de mots de passe
git diff --staged | grep -i "password\|secret\|token\|api.key"
# Résultat attendu: (rien)

# 3. Vérifiez node_modules
git ls-files | grep "node_modules"
# Résultat attendu: (rien)

# 4. Vérifiez target/ Maven
git ls-files | grep "/target"
# Résultat attendu: (rien)

# 5. Vérifiez les fichiers sensibles
git ls-files | grep -E "\.(pem|key|jks|p12)$"
# Résultat attendu: (rien)
```

## 📋 Vérifie aussi ces fichiers

- [ ] **.gitignore** - À jour pour votre projet
- [ ] **.gitattributes** - Fins de lignes correctes
- [ ] **.env.example** - Mis à jour si config change
- [ ] **CONTRIBUTING.md** - Instructions à jour
- [ ] **README.md** - Prêt pour les futurs devs

## 🚀 Après le Push

- [ ] **Vérifiez que le CI/CD passe** (GitHub Actions, etc.)
- [ ] **Attendez l'approbation du code review** si vous êtes en équipe
- [ ] **Mergez en main** une fois approuvé

## 🆘 Si vous avez déjà poussé du sensible

```bash
# URGENT: Changez vos secrets en production!

# Supprimez du historique Git (IRREVERSIBLE!)
git filter-branch --tree-filter 'rm -rf node_modules' -- --all
git filter-branch --tree-filter 'rm -f .env' -- --all

# Force push (attention: affecte tous les collaborateurs)
git push --force-with-lease origin main

# Informez votre équipe immédiatement!
```

---

## Template de Pull Request

Quand vous créez une PR:

```markdown
## Description
[Description claire de vos changements]

## Type de changement
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changements
- Changement 1
- Changement 2
- Changement 3

## Tests effectués
- [ ] Frontend tests ✓
- [ ] Backend tests ✓
- [ ] Manuel testing ✓

## Screenshots (si applicable)
[Ajoutez des captures d'écran]

## Notes supplémentaires
[Toute info importante]
```

---

**Dernière vérification avant le push?**

```bash
# Exécutez ceci:
bash scripts/verify-gitignore.sh  # ou .ps1 sur Windows
git status
git diff --cached | head -50
```

**Si tout est vert ✓ vous êtes prêt à pusher! 🚀**
