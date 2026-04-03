# Résidanat TN - Plateforme de Gestion des Concours de Résidanat

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.2-brightgreen)
![Angular](https://img.shields.io/badge/Angular-17-red)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Microservices](https://img.shields.io/badge/Architecture-Microservices-orange)

Une plateforme web moderne et sécurisée pour la gestion complète du concours de résidanat en Tunisie. Cette application repose sur une architecture microservices robuste, intégrant une validation de dossiers assistée par Intelligence Artificielle.

## 🚀 Fonctionnalités Clés

- 🔐 **Authentification Multi-Services** : Gestion sécurisée des comptes candidats et administrateurs via `auth-service` (JWT).
- 📝 **Inscription en Ligne** : Formulaire dynamique et multi-étapes pour la soumission des candidatures.
- 🤖 **Validation IA** : Validation automatique des documents (CIN, Diplômes) via un service Python dédié.
- 📧 **Notifications Automatisées** : Système d'envoi de mails pour le statut des dossiers via n8n.
- 📋 **Gestion Administrative** : Dashboard complet pour l'administration du ministère (statistiques, validation, export).
- 🗺️ **Cartographie 3D** : Visualisation immersive des facultés et centres d'examen.

## 🏗️ Architecture Technique

Le projet est décomposé en plusieurs microservices orchestrés par Docker Compose :

- **Gateway Service** : Point d'entrée unique (Port 8080).
- **Discovery Service (Eureka)** : Service de nommage et de découverte des instances.
- **Config Service** : Centralisation des configurations.
- **Auth Service** : Gestion des utilisateurs et de la sécurité.
- **Dossier Service** : Gestion des candidatures et des documents.
- **Notification Service** : Interfaçage avec n8n pour les alertes mails.
- **IA Validation Service** : Algorithmes de traitement d'images et OCR pour la validation.
- **Front-end Angular** : Interface utilisateur réactive et moderne.

## 🛠️ Installation et Démarrage Rapide

### Prérequis
- **Docker Desktop** (avec Docker Compose)
- **Git**
- **n8n** (optionnel, pour l'envoi de mails réels)

### Étape 1 : Cloner le projet
```bash
git clone https://github.com/SirineHaboubi/pfe_version.git
cd pfe_version
```

### Étape 2 : Configurer les variables d'environnement
Copiez le fichier `.env.example` vers `.env` et ajustez les ports ou les mots de passe si nécessaire.

### Étape 3 : Lancer l'application avec Docker
Exécutez la commande suivante à la racine du projet :
```bash
docker-compose up -d --build
```
*Note : Le premier build peut prendre quelques minutes car il télécharge les dépendances Java et Node.js.*

### Étape 4 : Accès aux services
- **Frontend** : [http://localhost:4200](http://localhost:4200)
- **Eureka Dashboard** : [http://localhost:8761](http://localhost:8761)
- **API Gateway** : [http://localhost:8080](http://localhost:8080)

## 📁 Structure des fichiers

```text
.
├── BACKEND/                    # Tous les microservices Java et Python
│   ├── auth-service            # Authentification & Utilisateurs
│   ├── dossier-service         # Gestion des candidatures
│   ├── ia-validation-service   # Traitement IA (Python)
│   ├── config-service          # Centralisation config
│   └── ...                    # Autres services (Gateway, Discovery)
├── residanat-frontend-main/    # Code source Angular
└── docker-compose.yml          # Fichier d'orchestration global
```

## 🔐 Comptes de Test (Candidat)
- **CIN** : `15354368`
- **Email** : `sirinehaboubi7@gmail.com`

---
Développé avec ❤️ pour le PFE Résidanat Tunisie.
