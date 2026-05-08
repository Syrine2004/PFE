# Guide de Contribution - ResidanatTN

Bienvenue dans le projet **ResidanatTN**! Ce guide vous aidera à configurer et exécuter l'application sur votre machine.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé:

- **Git** - Contrôle de version (https://git-scm.com/)
- **Docker & Docker Compose** - Containerisation (https://docs.docker.com/get-docker/)
- **Node.js** (v18+) & pnpm - Pour le frontend Angular
- **Java** (JDK 17+) - Pour les services backend
- **PostgreSQL 15** - Base de données (si pas Docker)
- **RabbitMQ** - Message broker (si pas Docker)
- **Python 3.9+** - Pour le service IA

> **Recommandé**: Utilisez Docker Compose pour lancer les dépendances (PostgreSQL, RabbitMQ)

## 🚀 Configuration Initiale

### 1. Clonez le repository

```bash
git clone https://github.com/VotreRepo/pfe_version.git
cd pfe_version
```

### 2. Configurez les variables d'environnement

```bash
# Copiez le fichier d'exemple
cp .env.example .env

# Editez .env avec vos paramètres locaux
# IMPORTANT: Ce fichier ne doit JAMAIS être commité!
```

### 3. Démarrez les dépendances avec Docker Compose

```bash
# Démarrez PostgreSQL, RabbitMQ, et tous les services backend
docker-compose up -d

# Vérifiez que tous les services sont en cours d'exécution
docker-compose ps
```

Services disponibles après démarrage:
- **Frontend**: http://localhost:4200
- **Gateway API**: http://localhost:8080
- **Auth Service**: http://localhost:8081
- **Concours Service**: http://localhost:8082
- **Dossier Service**: http://localhost:8084
- **IA Validation Service**: http://localhost:8085
- **Eureka Discovery**: http://localhost:8761
- **Config Server**: http://localhost:8888
- **RabbitMQ Admin**: http://localhost:15672 (guest/guest)
- **pgAdmin**: http://localhost:5050 (admin@admin.com/admin)

## 📦 Installation du Frontend

```bash
cd residanat-frontend-main

# Installez les dépendances avec pnpm
pnpm install

# Démarrez le serveur de développement
pnpm start

# L'application sera accessible à http://localhost:4200
```

## ⚙️ Installation & Compilation du Backend

Les services backend sont containerisés avec Docker Compose. Pour modifier et recompiler:

### Si vous voulez compiler un service localement:

```bash
cd BACKEND/residanat-backend-auth-service-main

# Compilez avec Maven
./mvnw clean package -DskipTests

# Ou sur Windows
mvnw.cmd clean package -DskipTests

# Démarrez le service (optionnel)
java -jar target/residanat-backend-0.0.1-SNAPSHOT.jar
```

### Pour reconstruire les images Docker:

```bash
# Depuis la racine du projet
docker-compose down
docker-compose up -d --build
```

## 🧪 Tests

### Frontend Angular

```bash
cd residanat-frontend-main

# Exécutez les tests unitaires
pnpm test

# Générez un rapport de couverture
pnpm test:coverage
```

### Backend Java

```bash
cd BACKEND/residanat-backend-auth-service-main

# Exécutez les tests
./mvnw test
```

### Service IA Python

```bash
cd test-IA-residanat

# Créez un environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installez les dépendances
pip install -r requirements.txt

# Exécutez les tests
python -m pytest
```

## 📝 Structure du Projet

```
pfe_version/
├── BACKEND/                              # Services microservices Java
│   ├── config-service/                  # Config Server
│   ├── discovery-service/               # Eureka Service Registry
│   ├── gateway-service-main/            # API Gateway
│   ├── auth-service/                    # Service d'authentification
│   ├── residanat-backend-concours-service/
│   ├── Dossier-Candidature-service/     # Service de dossiers
│   ├── ia-validation-service/           # Service de validation IA
│   └── shared-config/                   # Configuration partagée
├── residanat-frontend-main/             # Frontend Angular
├── test-IA-residanat/                   # Tests du service IA
├── docker-compose.yml                   # Orchestration des services
├── .gitignore                           # Fichiers à ignorer
├── .env.example                         # Template de configuration
└── README.md                            # Documentation du projet
```

## 🔐 Fichiers Importants

### ❌ Ne JAMAIS commiter:

```
.env                    # Variables sensibles
node_modules/          # Dépendances npm
BACKEND/*/target/      # Artefacts de build Maven
venv/                  # Environnement Python virtuel
*.log                  # Fichiers de logs
uploads/dossiers/*/    # Fichiers utilisateurs
docker-compose.override.yml  # Overrides locaux
```

### ✅ À commiter:

```
.gitignore             # Liste des fichiers ignorés
.env.example           # Template d'environnement
pom.xml               # Dépendances Maven
package.json          # Dépendances npm
Dockerfile            # Configuration Docker
docker-compose.yml    # Orchestration
```

## 🔄 Workflow de Développement

### 1. Créez une branche feature

```bash
git checkout -b feature/ma-nouvelle-feature
```

### 2. Faites vos modifications

```bash
# Frontend
cd residanat-frontend-main
# Modifiez les fichiers ...

# Backend Java
cd BACKEND/residanat-backend-auth-service-main
# Modifiez les fichiers ...
```

### 3. Testez localement

```bash
# Frontend: pnpm test:coverage
# Backend: mvn test
# Docker: docker-compose up -d --build
```

### 4. Committez avec des messages clairs

```bash
git add .
git commit -m "feat: ajout de la fonctionnalité X"
```

### 5. Pushez et créez une Pull Request

```bash
git push origin feature/ma-nouvelle-feature
```

## 🐛 Dépannage

### Les services Docker ne démarrent pas

```bash
# Vérifiez les logs
docker-compose logs -f

# Redémarrez tout
docker-compose down
docker-compose up -d

# Reconstruisez les images
docker-compose up -d --build
```

### Port déjà utilisé

```bash
# Vérifiez les ports utilisés
# Windows: netstat -ano | findstr :8080
# Linux/Mac: lsof -i :8080

# Changez les ports dans docker-compose.yml
```

### node_modules corrompus

```bash
cd residanat-frontend-main
rm -rf node_modules
pnpm install
```

### Erreurs de compilation Maven

```bash
cd BACKEND/residanat-backend-auth-service-main
./mvnw clean
./mvnw clean package -DskipTests
```

## 📚 Documentation Supplémentaire

- [Documentation Microservices](./BACKEND/README.md)
- [Documentation Frontend Angular](./residanat-frontend-main/README.md)
- [Architecture du Système](./docs/ARCHITECTURE.md)

## 💬 Questions ou Problèmes?

1. Consultez les **Issues GitHub**
2. Contactez l'équipe de développement
3. Vérifiez la **CONTRIBUTING.md** pour les conventions de code

---

**Merci de contribuer à ResidanatTN! 🎉**
