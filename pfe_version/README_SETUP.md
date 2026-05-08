# ResidanatTN - Système de Gestion des Dossiers de Candidature

![Status](https://img.shields.io/badge/status-in%20development-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18+-green)
![Java](https://img.shields.io/badge/java-17+-red)

**ResidanatTN** est une plateforme web complète permettant la gestion et le traitement des dossiers de candidature pour les formations supérieures en Tunisie.

## ✨ Fonctionnalités Principales

- 🎓 **Inscription au Concours** - Formulaires multi-étapes pour les candidats
- 📋 **Gestion des Dossiers** - Suivi du statut des candidatures
- 🤖 **Validation IA** - Reconnaissance de documents et validation automatique
- 🔐 **Authentification Sécurisée** - JWT tokens avec microservices
- 📊 **Dashboard Admin** - Gestion et statistiques des candidatures
- 🔄 **Architecture Microservices** - Scalable et maintenable
- 🐳 **Containerisée** - Docker Compose pour déploiement facile

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Angular                          │
│              (Port 4200 - Responsive UI)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              API Gateway (Spring Cloud)                      │
│                    (Port 8080)                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
      ┌────▼─────┐    ┌───▼─────┐   ┌────▼──────┐
      │   Auth    │    │ Concours│   │  Dossier  │
      │ Service   │    │ Service │   │ Service   │
      │  8081     │    │  8082   │   │  8084     │
      └────┬─────┘    └───┬─────┘   └────┬──────┘
           │               │               │
      ┌────▼───────────────▼───────────────▼────┐
      │   PostgreSQL Databases (Multi-tenant)   │
      │  Auth | Concours | Dossier (Ports 543X)│
      └────────────────────────────────────────┘
           
      ┌────────────────────────────────────────┐
      │    RabbitMQ Message Broker              │
      │         (Port 5672)                     │
      └────────────────────────────────────────┘
           
      ┌────────────────────────────────────────┐
      │  IA Validation Service (Python/ML)      │
      │         (Port 8085)                     │
      └────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Git
- Node.js 18+ (pour développement frontend)
- Java 17+ (pour développement backend)

### 1. Clonez et configurez

```bash
git clone https://github.com/votre-repo/pfe_version.git
cd pfe_version

# Configurez les variables d'environnement
cp .env.example .env
# Editez .env avec vos valeurs
```

### 2. Démarrez les services

```bash
# Lancez tout avec Docker Compose
docker-compose up -d

# Attendez ~30 secondes que tous les services soient prêts
docker-compose ps
```

### 3. Accédez à l'application

- **Frontend**: http://localhost:4200
- **API Gateway**: http://localhost:8080
- **Eureka Dashboard**: http://localhost:8761
- **pgAdmin**: http://localhost:5050

### 4. Comptes de Test

Vérifiez les credentials dans votre `.env` configuré.

## 📁 Structure du Projet

```
pfe_version/
├── BACKEND/                                   # Services microservices
│   ├── config-service/                       # Spring Cloud Config Server
│   ├── discovery-service/                    # Eureka Service Registry  
│   ├── gateway-service-main/                 # API Gateway
│   ├── residanat-backend-auth-service-main/  # Service Authentification
│   ├── residanat-backend-concours-service/   # Service Concours
│   ├── Dossier-Candidature-service/          # Service Dossiers
│   ├── ia-validation-service/                # Service IA (Python)
│   └── shared-config/                        # Configuration commune
├── residanat-frontend-main/                  # Frontend Angular
├── test-IA-residanat/                        # Tests du service IA
├── docker-compose.yml                        # Orchestration
├── .gitignore                                # Fichiers ignorés
├── .env.example                              # Template d'env
├── CONTRIBUTING.md                           # Guide de contribution
├── DEPLOYMENT.md                             # Guide de déploiement
└── README.md                                 # Ce fichier
```

## 🛠️ Développement

### Frontend

```bash
cd residanat-frontend-main

# Installation
pnpm install

# Développement (avec hot reload)
pnpm start

# Build production
pnpm build

# Tests
pnpm test:coverage
```

### Backend Java

```bash
cd BACKEND/residanat-backend-auth-service-main

# Compilation
./mvnw clean package -DskipTests

# Tests
./mvnw test

# Exécution locale (nécessite BDD/RabbitMQ)
java -jar target/residanat-backend-0.0.1-SNAPSHOT.jar
```

### Service IA Python

```bash
cd BACKEND/ia-validation-service

# Setup environnement
python -m venv venv
source venv/bin/activate

# Installation dépendances
pip install -r requirements.txt

# Tests
python -m pytest
```

## 📚 Documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guide pour contribuer au projet
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Instructions de déploiement en production
- **[BACKEND/README.md](./BACKEND/README.md)** - Documentation des services backend
- **[residanat-frontend-main/README.md](./residanat-frontend-main/README.md)** - Documentation du frontend

## 🔐 Sécurité

### ⚠️ Points Importants

1. **Ne jamais commiter `.env`** - Stockez les secrets en dehors du repo
2. **Changez les passwords par défaut** - JWT_SECRET, DB passwords, etc.
3. **Configurez HTTPS en production** - Utilisez Let's Encrypt
4. **Utilisez un reverse proxy** - Nginx ou HAProxy
5. **Activez les backups** - Planifiez des sauvegardes régulières

## 📝 Règles Git

Avant de commiter, assurez-vous que:

- ✅ `.env` n'est PAS commité
- ✅ `node_modules/`, `target/`, `venv/` sont ignorés
- ✅ Les fichiers de build (logs, etc) sont ignorés
- ✅ Messages de commit clairs en Français ou Anglais
- ✅ Code testé localement

## 🤝 Contribution

1. **Fork** le repository
2. **Créez une branche** (`git checkout -b feature/ma-feature`)
3. **Commitez** vos changements (`git commit -m 'feat: description'`)
4. **Poussez** vers votre fork (`git push origin feature/ma-feature`)
5. **Créez une Pull Request**

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour plus de détails.

## 🐛 Dépannage

### Les services ne démarrent pas

```bash
# Vérifiez les logs
docker-compose logs -f

# Reconstruisez les images
docker-compose down
docker-compose up -d --build
```

### Erreurs de port déjà utilisé

```bash
# Windows: netstat -ano | findstr :8080
# Linux:   lsof -i :8080

# Modifiez les ports dans docker-compose.yml
```

### Frontend: node_modules corrompus

```bash
cd residanat-frontend-main
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📊 Performance

- **Frontend**: Optimisé avec Angular lazy loading
- **Backend**: Microservices scalables
- **Database**: Indexes optimisés, cache Redis (optionnel)
- **Messages**: RabbitMQ pour processing asynchrone

## 🚀 Déploiement

**Development**: `docker-compose up -d`
**Production**: Voir [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📄 License

Ce projet est sous license MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

## 👩‍💻 Auteurs & Contributeurs

- **Équipe ResidanatTN** - [Votre Organisation]

## 📞 Contact & Support

- 📧 Email: support@residanat.tn
- 🐛 Issues: [GitHub Issues](https://github.com/votre-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/votre-repo/discussions)

---

**Merci d'utiliser ResidanatTN! 🎉**

Développé avec ❤️ pour la Tunisie
