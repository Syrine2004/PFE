# Résidanat TN - Plateforme de Gestion des Concours de Résidanat

![Status](https://img.shields.io/badge/status-in%20development-blue)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.2-brightgreen)
![Angular](https://img.shields.io/badge/Angular-17-red)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Architecture](https://img.shields.io/badge/Architecture-Microservices-orange)

**Résidanat TN** est une plateforme web moderne et sécurisée permettant la gestion complète, le traitement et la validation des dossiers de candidature pour le concours de résidanat en médecine en Tunisie.

## ✨ Fonctionnalités Principales

- 🎓 **Inscription en Ligne** : Formulaires multi-étapes pour les candidats.
- 🤖 **Validation IA** : Reconnaissance de documents (CIN, Diplômes) et validation automatique via un service Python dédié (EasyOCR).
- 📧 **Notifications Automatisées** : Système d'envoi de mails pour le suivi du statut des dossiers interfacé avec n8n.
- 🗺️ **Cartographie 3D** : Visualisation immersive des facultés et centres d'examen.
- 🔐 **Authentification Sécurisée** : Gestion des comptes (JWT) sécurisée via microservices.
- 📊 **Dashboard Admin** : Interface complète pour l'administration du ministère (statistiques, validation, export).

## 🏗️ Architecture

L'application repose sur une architecture microservices robuste orchestrée par Docker Compose :

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Angular                         │
│              (Port 4200 - Responsive UI)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              API Gateway (Spring Cloud)                     │
│                    (Port 8080)                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌───────────────┼───────────────┐
            │               │               │
      ┌────▼─────┐    ├───▼─────┐   ┌────▼──────┐
      │   Auth   │    │ Concours│   │  Dossier  │
      │ Service  │    │ Service │   │ Service   │
      │  8081    │    │  8082   │   │  8084     │
      └────┬─────┘    └───┬─────┘   └────┬──────┘
           │               │               │
      ┌────▼───────────────▼───────────────▼────┐
      │   PostgreSQL Databases (Multi-tenant)   │
      │   Auth | Concours | Dossier (Ports 543X)│
      └─────────────────────────────────────────┘
            
      ┌─────────────────────────────────────────┐
      │     RabbitMQ Message Broker             │
      │         (Port 5672)                     │
      └─────────────────────────────────────────┘
            
      ┌─────────────────────────────────────────┐
      │  IA Validation Service (Python/ML)      │
      │         (Port 8085)                     │
      └─────────────────────────────────────────┘