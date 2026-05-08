# 📊 Architecture Base de Données - Sprint 2

## 📋 Vue d'ensemble

Cette architecture respecte le modèle **microservices** où chaque service possède sa propre base de données. Les relations entre services sont gérées via des **identifiants transientes** (références logiques) plutôt que des clés étrangères physiques.

---

## 🏗️ Microservices et leurs Bases de Données

### 1️⃣ **Auth Service** → `residanat_auth_db` (Port 5433)

**Tables principales:**

| Table | Description | Attributs clés |
|-------|-------------|-----------------|
| **Utilisateur** | Entité de base pour tous les utilisateurs (candidats, admins) | id, email, motDePasse, role, nom, prenom, cin, faculte |
| **Administrateur** | Administrateurs du ministère avec permissions | id, utilisateur_id, role, permissions[], departement |
| **Candidate** | Entité spécialisée pour candidats (Sprint 2) | id, utilisateur_id, cin, email, prenom, nom, faculte |
| **Role** | Rôles disponibles | id, nom, description |
| **Permission** | Permissions par rôle | id, nom, description |
| **Role_Permission** | Mapping entre rôles et permissions | role_id, permission_id |
| **Audit_Log** | Trace des actions des administrateurs | id, admin_id, action, entite, entite_id |

**Relations:**
```
Utilisateur (1) ──→ (1) Administrateur
Utilisateur (1) ──→ (1) Candidate
Role (1) ──→ (*) Role_Permission (←  (*) Permission
```

---

### 2️⃣ **Concours Service** → `residanat_concours_db` (Port 5434)

**Tables principales:**

| Table | Description | Attributs clés |
|-------|-------------|-----------------|
| **Concours** | Définition d'un concours/competition | id, libelle, annee, etat, dateDebut, dateFin |
| **AffectationCandidat** | Affectation des candidats aux centres/spécialités (Sprint 2) | id, candidat_id, dossier_id, concours_id, statut_dossier, centre_examen |
| **Historique_Statut_Dossier** | Trace l'évolution du statut | id, affectation_id, ancien_statut, nouveau_statut, date_changement |
| **CentreExamen** | Centres d'examen disponibles | id, nom, adresse, ville, gouvernorat, coordonnees_gps |
| **Specialite** | Spécialités/formations pour un concours | id, concours_id, libelle, nombre_places |
| **Affectation_Specialite** | Choix de spécialités par candidat | id, affectation_candidat_id, specialite_id, choix_ordre |

**Relations:**
```
Concours (1) ──→ (*) AffectationCandidat
Concours (1) ──→ (*) Specialite
AffectationCandidat (1) ──→ (*) Historique_Statut_Dossier
Specialite (1) ──→ (*) Affectation_Specialite
AffectationCandidat (1) ──→ (*) Affectation_Specialite
```

**Reference Transiente:**
- `AffectationCandidat.candidat_id` → ID depuis Auth Service
- `AffectationCandidat.dossier_id` → ID depuis Dossier Service

**Enum:**
- `statut_dossier` = [EN_ATTENTE, VALIDE, REJETE, AFFECTE, CONVOQUE]

---

### 3️⃣ **Convocation Service** → `residanat_convocation_db` (Port 5436) **[NUOVO]**

**Tables principales:**

| Table | Description | Attributs clés |
|-------|-------------|-----------------|
| **Convocation** | Avis de convocation pour examens (Sprint 2) | id, affectation_candidat_id, candidat_id, numero_convocation, dateDebut, dateFin, statut, centre_examen_id |
| **PlandAccès** | Plans d'accès et localisation des centres (Sprint 2) | id, centre_examen_id, nom_faculte, chemin_fichier, coordonnees_gps, adresse_complete |
| **Itineraire** | Itinéraires d'accès pour chaque mode transport | id, plan_acces_id, mode_transport, description, duree_estimee |
| **Document_Convocation** | Fichiers générés (PDF, QR code) | id, convocation_id, type_document, chemin_fichier |
| **Verification_QR_Code** | Log des vérifications de codes QR (check-in) | id, convocation_id, candidat_id, date_verification, statut |
| **Presence_Examen** | Enregistrement présence/absence | id, convocation_id, candidat_id, statut_presence, heure_arrivee |
| **Historique_Convocation** | Modifications/reports de convocation | id, convocation_id, ancien_statut, nouveau_statut, raison_modification |

**Relations:**
```
Convocation (1) ──→ (*) Document_Convocation
Convocation (1) ──→ (*) Verification_QR_Code
Convocation (1) ──→ (*) Presence_Examen
Convocation (1) ──→ (*) Historique_Convocation
PlandAccès (1) ──→ (*) Itineraire
```

**References Transientes:**
- `Convocation.affectation_candidat_id` → ID depuis Concours Service
- `Convocation.candidat_id` → ID depuis Auth Service
- `Convocation.concours_id` → ID depuis Concours Service
- `PlandAccès.centre_examen_id` → ID depuis Concours Service

**Enum:**
- `statut_convocation` = [PLANIFIEE, EN_COURS, TERMINEE, ANNULEE, REPORTEE]

---

### 4️⃣ **Notification Service** → `residanat_notification_db` (Port 5437)

**Tables principales:**

| Table | Description | Attributs clés |
|-------|-------------|-----------------|
| **Type_Notification** | Modèles de types de notifications | id, code, libelle, template_email, template_sms, priorite |
| **Notification** | Notifications envoyées aux candidats (Sprint 2) | id, candidat_id, type_notification_id, canal, message, statut, date_envoi |
| **Preference_Notification_Candidat** | Préférences de notifications du candidat | id, candidat_id, notification_email_active, frequence, horaires |
| **Template_Notification** | Templates personnalisés par concours | id, type_notification_id, concours_id, nom_template, corps_template |
| **Notification_Queue** | Queue pour traitement asynchrone | id, notification_id, statut, nb_tentatives |
| **Log_Notification** | Log détaillé de chaque envoi | id, notification_id, canal, date_tentative, succes, message_erreur |

**Relations:**
```
Type_Notification (1) ──→ (*) Notification
Type_Notification (1) ──→ (*) Template_Notification
Notification (1) ──→ (*) Notification_Queue
Notification (1) ──→ (*) Log_Notification
Preference_Notification_Candidat (1) ← → (1) Candidat
```

**References Transientes:**
- `Notification.candidat_id` → ID depuis Auth Service
- `Notification.dossier_id` → ID depuis Dossier Service
- `Notification.convocation_id` → ID depuis Convocation Service
- `Notification.concours_id` → ID depuis Concours Service
- `Template_Notification.concours_id` → ID depuis Concours Service

**Enum:**
- `notification_type` = [INSCRIPTION_CONFIRMEE, DOSSIER_REJETE, DOSSIER_VALIDE, CONVOCATION_AVIS, RAPPEL_EXAMEN, RESULTATS_AVAILABLES, AFFECTATION_CONFIRMEE, INFORMATION_GENERALE, URGENCE]
- `canal_notification` = [EMAIL, SMS, PUSH, SITE_WEB]
- `statut_notification` = [EN_ATTENTE, ENVOYEE, LUE, ECHEC, ANNULEE]

---

### 5️⃣ **Dossier Service** → `residanat_dossier_db` (Port 5435)

**Tables principales:**

| Table | Description | Attributs clés |
|-------|-------------|-----------------|
| **Dossier_Candidature** | Dossier d'inscription d'un candidat (amélioré Sprint 2) | id, candidat_id, concours_id, affectation_candidat_id, numero_dossier, statut, date_soumission |
| **Document** | Documents uploadés (amélioré Sprint 2) | id, dossier_id, nom, type_document, statut, chemin_fichier, date_upload |
| **Evaluation_IA** | Résultats analyse IA des documents (amélioré Sprint 2) | id, dossier_id, score, score_cin, score_diplome, score_photo, anomalies |
| **Historique_Statut_Dossier** | Trace statut du dossier | id, dossier_id, ancien_statut, nouveau_statut, date_changement |
| **Revision_Document** | Révisions de documents | id, document_id, numero_revision, chemin_fichier, date_upload |
| **Tache_Analyse_IA** | Queue de traitement IA | id, dossier_id, document_id, type_analyse, statut, date_creation |
| **Validation_Manuelle** | Audit trail des validations manuelles | id, dossier_id, document_id, admin_id, decision, date_validation |

**Relations:**
```
Dossier_Candidature (1) ──→ (*) Document
Dossier_Candidature (1) ──→ (*) Evaluation_IA
Dossier_Candidature (1) ──→ (*) Historique_Statut_Dossier
Document (1) ──→ (*) Revision_Document
Dossier_Candidature (1) ──→ (*) Tache_Analyse_IA
Dossier_Candidature (1) ──→ (*) Validation_Manuelle
Evaluation_IA (1) ← ← ← Tache_Analyse_IA
```

**References Transientes:**
- `Dossier_Candidature.candidat_id` → ID depuis Auth Service
- `Dossier_Candidature.concours_id` → ID depuis Concours Service
- `Dossier_Candidature.affectation_candidat_id` → ID depuis Concours Service

**Enum:**
- `type_document` = [DIPLOME, CERTIFICAT_STUDIES, CIN, PASSPORT, PHOTO_IDENTITE, RELEVÉ_NOTES, LETTRE_RECOMMANDATION, ATTESTATION_TRAVAIL, AUTRE]
- `statut_document` = [EN_ATTENTE, VALIDE, REJETE, EN_REVISION]

---

## 🔗 Flux d'Interactions entre Services (Sprint 2)

```
┌─────────────────┐
│  Auth Service   │
├─────────────────┤
│ Utilisateur     │
│ Administrateur  │
│ Candidate       │
└────────┬────────┘
         │ candidat_id
         │ admin_id
         ▼
┌─────────────────┐        ┌─────────────────┐
│ Concours Service│        │ Dossier Service │
├─────────────────┤        ├─────────────────┤
│ Concours        │◄──────►│ Dossier         │
│ Affectation     │dossier │ Document        │
│ Specialite      │_id     │ Evaluation_IA   │
└────────┬────────┘        └────────┬────────┘
         │ affectation_id           │ dossier_id
         │                          │
         ▼                          ▼
┌─────────────────┐        ┌─────────────────┐
│Convocation Srv  │        │ Notification    │
├─────────────────┤        ├─────────────────┤
│ Convocation     │        │ Notification    │
│ PlandAccès      │───────►│ TypeNotif       │
│ Itineraire      │        │ Preference      │
└─────────────────┘        └─────────────────┘
```

---

## 💾 Stratégie d'Identification Transiente

Dans cette architecture, au lieu d'avoir des **clés étrangères physiques** entre services, nous utilisons des **identifiants transientes**:

### Exemple: Dossier_Candidature

```sql
CREATE TABLE dossier_candidature (
    id BIGSERIAL PRIMARY KEY,
    
    -- Références LOGIQUES (pas de FK physique)
    candidat_id BIGINT NOT NULL,        -- From Auth Service
    concours_id BIGINT NOT NULL,        -- From Concours Service
    affectation_candidat_id BIGINT,     -- From Concours Service
    
    -- ... autres colonnes
    
    -- NON validé par DB, géré au niveau application
);
```

### Avantages:
✅ Couplage faible entre services  
✅ Services indépendants et scalables  
✅ Pas de dépendances directes BD  
✅ Flexibility dans la distribution des données  

### Responsabilité:
- **Application layer** valide les références
- **API Gateway** gère les appels cross-services
- **Chaque service** gère sa propre intégrité de données

---

## 🔄 Migrations Sprint 1 → Sprint 2

### Tables modifiées:

| Table | Changements Sprint 2 |
|-------|----------------------|
| **Utilisateur** | Ajout colonnes: `type_document_identite`, meilleure organisation des rôles |
| **Concours** | Stable, plus de metadata sur les places |
| **DossierCandidature** | Ajout: `affectation_id`, infos professionnelles, adresse, télé |
| **Document** | Ajout: statut validation, hash fichier, audit trail |
| **Evaluation_IA** | Ajout: recommendation, confiance, analyse détaillée |

### Nouvelles tables:
- ✅ Administrateur
- ✅ Candidate (séparation des candidats)
- ✅ AffectationCandidat
- ✅ Convocation
- ✅ PlandAccès
- ✅ Notification + préférences

---

## 📊 Diagrammes de Migration

### Avant (Sprint 1):
```
Utilisateur ──────► Concours
     │                  │
     ├─────────────────┤
     │
 Dossier ──► Document ──► EvaluationIA
```

### Après (Sprint 2):
```
Utilisateur ──► Administrateur
     │              (NEW)
     │
   Candidate (NEW)
     │
     ├────────► Concours
     │              │
     │          Affectation (NEW)
     │          Specialite
 Dossier ──► Document ──► EvaluationIA
     │
  Convocation (NEW) ──► PlandAccès (NEW)
                    ├─► Itineraire (NEW)
                    └─► Presence (NEW)
                    
     └──────────────────► Notification (NEW)
```

---

## 🚀 Scripts d'Installation

Les fichiers SQL sont à exécuter sur chaque base de données:

1. **Auth Service:**
   ```bash
   psql -U postgres -d residanat_auth < sprint2_auth_service.sql
   ```

2. **Concours Service:**
   ```bash
   psql -U postgres -d residanat_concours < sprint2_concours_service.sql
   ```

3. **Convocation Service:**
   ```bash
   psql -U postgres -d residanat_convocation < sprint2_convocation_service.sql
   ```

4. **Notification Service:**
   ```bash
   psql -U postgres -d residanat_notification < sprint2_notification_service.sql
   ```

5. **Dossier Service:**
   ```bash
   psql -U postgres -d residanat_dossier < sprint2_dossier_service.sql
   ```

---

## 📝 Notes Importantes

- **Pas de cascade delete entre services** - Gérer les suppressions au niveau application
- **Transactions distribuées** - Utiliser des events/messages pour cohérence
- **Indexes** - Optimisés pour les requêtes les plus fréquentes
- **ENUMS** - Utiliser les types PostgreSQL pour validation au niveau BD
- **Audit trail** - Chaque modification importante est tracée
- **Soft deletes** - Considérer pour données sensibles (ajouter `date_suppression`)

