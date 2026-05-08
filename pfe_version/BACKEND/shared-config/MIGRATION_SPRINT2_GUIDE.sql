-- ============================================================================
-- Sprint 2 - Migration Script Global
-- Exécuter ce script pour initialiser TOUS les services
-- ============================================================================

-- Note: Ce script est un guide. Exécuter les scripts individuels par service:
-- 1. sprint2_auth_service.sql       → residanat_auth (Port 5433)
-- 2. sprint2_concours_service.sql   → residanat_concours (Port 5434)
-- 3. sprint2_dossier_service.sql    → residanat_dossier (Port 5435)
-- 4. sprint2_convocation_service.sql → residanat_convocation (Port 5436)
-- 5. sprint2_notification_service.sql → residanat_notification (Port 5437)

-- ============================================================================
-- SCHEMA MIGRATION CHECKLIST
-- ============================================================================

/*

## ✅ PHASE 1: AUTH SERVICE
- [x] Créer table Utilisateur (amélioré)
- [x] Créer table Administrateur (NEW)
- [x] Créer table Candidate (NEW)
- [x] Créer Role / Permission / RolePermission
- [x] Créer AuditLog
- [x] Insérer rôles de base

## ✅ PHASE 2: CONCOURS SERVICE
- [x] Créer ENUM statut_dossier
- [x] Table Concours (amélioré)
- [x] Table AffectationCandidat (NEW)
- [x] Historique_Statut_Dossier
- [x] CentreExamen
- [x] Specialite
- [x] Affectation_Specialite

## ✅ PHASE 3: CONVOCATION SERVICE
- [x] Créer ENUM statut_convocation
- [x] Table Convocation (NEW)
- [x] Table PlandAccès (NEW)
- [x] Itineraire
- [x] Document_Convocation
- [x] Verification_QR_Code
- [x] Presence_Examen
- [x] Historique_Convocation

## ✅ PHASE 4: NOTIFICATION SERVICE
- [x] Créer ENUMs (notification_type, canal, statut)
- [x] Table Type_Notification
- [x] Table Notification (NEW)
- [x] Preference_Notification_Candidat
- [x] Template_Notification
- [x] Notification_Queue
- [x] Log_Notification
- [x] Insérer types de notification par défaut

## ✅ PHASE 5: DOSSIER SERVICE
- [x] Créer ENUMs (type_document, statut_document)
- [x] Table Dossier_Candidature (amélioré)
- [x] Table Document (amélioré)
- [x] Table Evaluation_IA (amélioré)
- [x] Historique_Statut_Dossier
- [x] Revision_Document
- [x] Tache_Analyse_IA
- [x] Validation_Manuelle

*/

-- ============================================================================
-- STRUCTURE GLOBALE DES MICROSERVICES
-- ============================================================================

/*

📦 ARCHITECTURE MICROSERVICES - SPRINT 2

┌──────────────────────────────────────────────────────────────┐
│                     Auth Service                             │
│                 (residanat_auth_db:5433)                     │
├──────────────────────────────────────────────────────────────┤
│ Tables: Utilisateur, Administrateur, Candidate, Role/Perm   │
│ PK: utilisateur_id (Utilisateur table)                      │
│ Reference: Utilisateur.id ~> Dossier.candidat_id          │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ candidat_id
                              │
┌──────────────────────────────────────────────────────────────┐
│                   Concours Service                           │
│              (residanat_concours_db:5434)                    │
├──────────────────────────────────────────────────────────────┤
│ Tables: Concours, AffectationCandidat, CentreExamen,        │
│         Specialite, Affectation_Specialite                  │
│ References:                                                 │
│   - AffectationCandidat.candidat_id ~> Auth.Utilisateur.id │
│   - AffectationCandidat.dossier_id ~> Dossier.id           │
│   - Affectation.concours_id = Concours.id                  │
└──────────────────────────────────────────────────────────────┘
   ▲                          ▲
   │ concours_id              │ dossier_id
   │                          │
┌──────────────────────────────────────────────────────────────┐
│                   Dossier Service                            │
│              (residanat_dossier_db:5435)                     │
├──────────────────────────────────────────────────────────────┤
│ Tables: Dossier_Candidature, Document, Evaluation_IA,       │
│         Tache_Analyse_IA, Validation_Manuelle              │
│ References:                                                 │
│   - Dossier.candidat_id ~> Auth.Utilisateur.id            │
│   - Dossier.concours_id ~> Concours.Concours.id          │
│   - Dossier.affectation_id ~> Concours.Affectation.id     │
└──────────────────────────────────────────────────────────────┘
   ▲                                      ▲
   │                                      │
   │                          affectation_id
   │                                      │
┌──────────────────────────────────────────────────────────────┐
│               Convocation Service                            │
│            (residanat_convocation_db:5436)                   │
├──────────────────────────────────────────────────────────────┤
│ Tables: Convocation, PlandAccès, Itineraire,               │
│         Presence_Examen, Verification_QR_Code              │
│ References:                                                 │
│   - Convocation.affectation_id ~> Concours.Affectation.id │
│   - Convocation.candidat_id ~> Auth.Utilisateur.id        │
│   - PlandAccès.centre_id ~> Concours.CentreExamen.id     │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               Notification Service                           │
│           (residanat_notification_db:5437)                   │
├──────────────────────────────────────────────────────────────┤
│ Tables: Notification, Type_Notification, Preference,        │
│         Template_Notification, Log_Notification            │
│ References:                                                 │
│   - Notification.candidat_id ~> Auth.Utilisateur.id       │
│   - Notification.convocation_id ~> Convocation.id         │
│   - Notification.dossier_id ~> Dossier.id                │
└──────────────────────────────────────────────────────────────┘

*/

-- ============================================================================
-- IDENTIFIANTS TRANSIENTES (Références Logiques)
-- ============================================================================

/*

Au lieu d'utiliser des clés étrangères physiques entre services,
nous utilisons des "identifiants transientes".

Exemple: Table AffectationCandidat

  CREATE TABLE affectation_candidat (
      id BIGSERIAL PRIMARY KEY,
      candidat_id BIGINT NOT NULL,      -- TRANSIENT: ID depuis Auth Service
      dossier_id BIGINT NOT NULL,       -- TRANSIENT: ID depuis Dossier Service
      concours_id BIGINT NOT NULL,      -- LOCAL FK vers Concours Service
      -- ...
  );

- candidat_id & dossier_id: Pas de FK physique, juste des références
- concours_id: FK physique car dans le même service

Validation:
- candidat_id vérifié par Auth Service API
- dossier_id vérifié par Dossier Service API
- concours_id vérifié localement par DB

Avantages:
✅ Services découplés
✅ Communication asynchrone possible
✅ Pas de couplage direct BD
✅ Chaque service autonome

*/

-- ============================================================================
-- RELATIONS TRANSVERSES (Cross-Service)
-- ============================================================================

/*

Ces relations nécessitent une coordination entre services via APIs:

1. Auth → Candidat création
   POST /api/auth/register → crée Utilisateur + Candidate

2. Auth → Administrateur création
   POST /api/auth/admin/create → crée Utilisateur + Administrateur

3. Concours → Affectation candidat
   POST /api/concours/{id}/affectation
   - Récupère candidat_id (Auth Service)
   - Récupère dossier_id (Dossier Service)
   - Valide score IA (Dossier Service)
   - Crée Affectation

4. Dossier → Convocation génération
   POST /api/dossier/{id}/generer-convocation
   - Récupère affectation (Concours Service)
   - Récupère plan d'accès (Convocation Service)
   - Crée Convocation

5. Convocation → Notification envoi
   POST /api/convocation/{id}/notifier
   - Récupère préférences (Notification Service)
   - Récupère template (Notification Service)
   - Envoie via queue

*/

-- ============================================================================
-- ENUMS DE RÉFÉRENCE (à créer dans chaque service)
-- ============================================================================

/*

AUTH SERVICE:
  - role: CANDIDAT, ADMIN, SUPER_ADMIN

CONCOURS SERVICE:
  - etat: PLANIFIEE, OUVERT, FERME, ANNULE
  - statut_dossier: EN_ATTENTE, VALIDE, REJETE, AFFECTE, CONVOQUE

CONVOCATION SERVICE:
  - statut_convocation: PLANIFIEE, EN_COURS, TERMINEE, ANNULEE, REPORTEE

NOTIFICATION SERVICE:
  - notification_type: (voir ci-dessus - 10 types)
  - canal_notification: EMAIL, SMS, PUSH, SITE_WEB
  - statut_notification: EN_ATTENTE, ENVOYEE, LUE, ECHEC, ANNULEE

DOSSIER SERVICE:
  - type_document: 9 types (DIPLOME, CIN, PHOTO, etc.)
  - statut_document: EN_ATTENTE, VALIDE, REJETE, EN_REVISION

*/

-- ============================================================================
-- SCRIPT DE DÉPLOIEMENT
-- ============================================================================

/*

## Méthode 1: Docker Compose Integration

Ajouter volume pour initialisation dans docker-compose.yml:

  postgres-auth:
    image: postgres:15
    volumes:
      - ./BACKEND/shared-config/sprint2_auth_service.sql:/docker-entrypoint-initdb.d/01-init.sql

  postgres-concours:
    image: postgres:15
    volumes:
      - ./BACKEND/shared-config/sprint2_concours_service.sql:/docker-entrypoint-initdb.d/01-init.sql

  # ... etc pour tous les services

## Méthode 2: Exécution Manuelle

```bash
# Pour chaque service:
psql -h localhost -U postgres -d residanat_auth < sprint2_auth_service.sql
psql -h localhost -U postgres -d residanat_concours < sprint2_concours_service.sql
psql -h localhost -U postgres -d residanat_dossier < sprint2_dossier_service.sql
psql -h localhost -U postgres -d residanat_convocation < sprint2_convocation_service.sql
psql -h localhost -U postgres -d residanat_notification < sprint2_notification_service.sql
```

## Méthode 3: Script Wrapper

Créer un script migration.sh qui exécute tout automatiquement

*/

-- ============================================================================
-- STATISTIQUES ET MONITORING
-- ============================================================================

/*

Après migration, vérifier avec:

SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';

-- Compter les tables par service:
Auth:        9 tables    (Utilisateur + Administrateur + Candidate + Role + Perm + AuditLog)
Concours:    7 tables    (Concours + Affectation + CentreExamen + Specialite + AffectationSpec + Historique)
Dossier:     7 tables    (Dossier + Document + EvaluationIA + Historique + Revision + TacheIA + Validation)
Convocation: 8 tables    (Convocation + PlandAccès + Itineraire + DocumentConvo + VerificationQR + Presence + Historique)
Notification:7 tables    (TypeNotif + Notification + Preference + Template + Queue + Log)

Total: ~38 tables

*/
