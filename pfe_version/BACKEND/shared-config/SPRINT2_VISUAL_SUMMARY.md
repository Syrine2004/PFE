# 📊 Sprint 2 - Résumé Visuel des Entités

## 🎯 Vue Globale - Toutes les Entités

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        PLATEFORME RÉSIDANAT TN - SPRINT 2                 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────┐      ┌──────────────────────────┐           ║
║  │   AUTH SERVICE          │      │  CONCOURS SERVICE        │           ║
║  │   (8081) - Port 5433    │      │  (8082) - Port 5434      │           ║
║  ├─────────────────────────┤      ├──────────────────────────┤           ║
║  │ • Utilisateur           │      │ • Concours               │           ║
║  │ • Administrateur (NEW)  │      │ • AffectationCandidat    │           ║
║  │ • Candidate (NEW)       │◄────►│ • CentreExamen           │           ║
║  │ • Role / Permission     │      │ • Specialite             │           ║
║  │ • AuditLog              │      │ • Affectation_Specialite │           ║
║  └─────────────────────────┘      └──────────────────────────┘           ║
║          ▲                                   ▲                            ║
║          │ candidat_id                      │ dossier_id                 ║
║          │                                  │                            ║
║          └──────────────────┬───────────────┘                            ║
║                             │                                             ║
║  ┌─────────────────────────────────────────────────────────┐             ║
║  │           DOSSIER SERVICE                               │             ║
║  │           (8084) - Port 5435                            │             ║
║  ├─────────────────────────────────────────────────────────┤             ║
║  │ • Dossier_Candidature                                  │             ║
║  │ • Document (amélioré)                                  │             ║
║  │ • Evaluation_IA (amélioré)                            │             ║
║  │ • Tache_Analyse_IA                                     │             ║
║  │ • Validation_Manuelle                                  │             ║
║  │ • Revision_Document                                    │             ║
║  │ • Historique_Statut_Dossier                           │             ║
║  └────────────────────▲───────────────────────────────────┘             ║
║                       │ affectation_id                                   ║
║                       │                                                   ║
║  ┌──────────────────────────────────┐  ┌──────────────────────────┐    ║
║  │ CONVOCATION SERVICE (NEW)        │  │ NOTIFICATION SERVICE     │    ║
║  │ (8086) - Port 5436               │  │ (8087) - Port 5437      │    ║
║  ├──────────────────────────────────┤  ├──────────────────────────┤    ║
║  │ • Convocation (NEW)              ├─►│ • Notification (NEW)     │    ║
║  │ • PlandAccès (NEW)               │  │ • Type_Notification     │    ║
║  │ • Itineraire (NEW)               │  │ • Preference (NEW)       │    ║
║  │ • Document_Convocation           │  │ • Template (NEW)         │    ║
║  │ • Verification_QR_Code           │  │ • Queue (NEW)            │    ║
║  │ • Presence_Examen                │  │ • Log (NEW)              │    ║
║  │ • Historique_Convocation         │  │                          │    ║
║  └──────────────────────────────────┘  └──────────────────────────┘    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 Tableau Récapitulatif: Tables par Service

### 🔐 AUTH SERVICE (residanat_auth_db)
| # | Table | Colonnes clés | Références |
|---|-------|---------------|-----------|
| 1 | **Utilisateur** | id, email, role, nom, prenom, cin, nationalite | PK |
| 2 | **Administrateur** | id, utilisateur_id, role, permissions[] | FK Utilisateur |
| 3 | **Candidate** | id, utilisateur_id, cin, email, nom, prenom | FK Utilisateur |
| 4 | Role | id, nom, description | Reference |
| 5 | Permission | id, nom, description | Reference |
| 6 | Role_Permission | role_id, permission_id | FK Role, FK Permission |
| 7 | Audit_Log | id, admin_id, action, entite, entite_id | FK Administrateur |
| 8 | (indices) | 3x indices | Performance |
| 9 | (data init) | Rôles par défaut | Seeds |

**Tables: 9 | Indices: 3+ | ENUMs: 0**

---

### 🎓 CONCOURS SERVICE (residanat_concours_db)
| # | Table | Colonnes clés | Références |
|---|-------|---------------|-----------|
| 1 | **Concours** | id, libelle, annee, etat, dateDebut, dateFin | PK |
| 2 | **AffectationCandidat** | id, candidat_id (T), dossier_id (T), concours_id | FK Concours |
| 3 | **Historique_Statut** | id, affectation_id, ancien/nouveau_statut | FK Affectation |
| 4 | **CentreExamen** | id, nom, adresse, ville, gouvernorat, gps | PK |
| 5 | **Specialite** | id, concours_id, libelle, nombre_places | FK Concours |
| 6 | **Affectation_Specialite** | id, affectation_id, specialite_id, choix_ordre | FK |
| 7 | (énums + indices) | statut_dossier ENUM | Performance |

**Tables: 7 | Indices: 5+ | ENUMs: 1 (statut_dossier)**

---

### 📚 DOSSIER SERVICE (residanat_dossier_db)
| # | Table | Colonnes clés | Références |
|---|-------|---------------|-----------|
| 1 | **Dossier_Candidature** | id, candidat_id (T), concours_id (T), numero_dossier, statut | PK |
| 2 | **Document** | id, dossier_id, nom, type_document, statut, chemin_fichier | FK |
| 3 | **Evaluation_IA** | id, dossier_id, score, score_cin/diplome/photo, anomalies | FK |
| 4 | **Historique_Statut** | id, dossier_id, ancien/nouveau_statut, raison | FK |
| 5 | **Revision_Document** | id, document_id, numero_revision, chemin_fichier | FK |
| 6 | **Tache_Analyse_IA** | id, dossier_id, type_analyse, statut | FK |
| 7 | **Validation_Manuelle** | id, dossier_id, admin_id (T), decision, commentaire | FK |

**Tables: 7 | Indices: 7+ | ENUMs: 2 (type_document, statut_document)**

---

### ✉️ CONVOCATION SERVICE (residanat_convocation_db)
| # | Table | Colonnes clés | Références |
|---|-------|---------------|-----------|
| 1 | **Convocation** | id, affectation_id (T), candidat_id (T), numero_convocation, dateDebut/Fin | PK |
| 2 | **PlandAccès** | id, centre_id (T), nom_faculte, chemin_fichier, gps, adresse | PK |
| 3 | **Itineraire** | id, plan_id, mode_transport, description, duree | FK PlandAccès |
| 4 | **Document_Convocation** | id, convocation_id, type_document, chemin_fichier | FK |
| 5 | **Verification_QR_Code** | id, convocation_id, candidat_id (T), date_verification, statut | FK |
| 6 | **Presence_Examen** | id, convocation_id, candidat_id (T), statut_presence, heure | FK |
| 7 | **Historique_Convocation** | id, convocation_id, ancien/nouveau_statut, raison | FK |
| 8 | (énums) | statut_convocation ENUM | Reference |

**Tables: 8 | Indices: 8+ | ENUMs: 1 (statut_convocation)**

---

### 🔔 NOTIFICATION SERVICE (residanat_notification_db)
| # | Table | Colonnes clés | Références |
|---|-------|---------------|-----------|
| 1 | **Type_Notification** | id, code, libelle, template_email, template_sms | PK |
| 2 | **Notification** | id, candidat_id (T), type_id, canal, message, statut | FK TypeNotif |
| 3 | **Preference_Notification** | id, candidat_id (T), channels, horaires | PK |
| 4 | **Template_Notification** | id, type_id, concours_id (T), corps, variables[] | FK |
| 5 | **Notification_Queue** | id, notification_id, statut, nb_tentatives | FK |
| 6 | **Log_Notification** | id, notification_id, canal, date, succes, erreur | FK |
| 7 | (data init) | 10 types par défaut | Seeds |

**Tables: 7 | Indices: 6+ | ENUMs: 3 (notification_type, canal, statut)**

---

## 🔗 Relations Inter-Services

### Vue Logique
```
AUTH SERVICE
    │
    ├─► candidat_id (transient)
    │
    └─────┬──────────────────────┐
          │                      │
    CONCOURS SERVICE        DOSSIER SERVICE
          │                      │
          ├─► dossier_id (T) ◄───┘
          │
          └─────┬──────────────────────┐
                │                      │
          CONVOCATION SERVICE    NOTIFICATION SERVICE
```

### Références Transientes (T)
```
Affectation_Candidat
  ├─ candidat_id (T) → Auth.Utilisateur.id
  └─ dossier_id (T) → Dossier.Dossier_Candidature.id

Convocation
  ├─ affectation_candidat_id (T) → Concours.Affectation.id
  ├─ candidat_id (T) → Auth.Utilisateur.id
  └─ concours_id (T) → Concours.Concours.id

Notification
  ├─ candidat_id (T) → Auth.Utilisateur.id
  ├─ dossier_id (T) → Dossier.Dossier.id
  ├─ convocation_id (T) → Convocation.Convocation.id
  └─ concours_id (T) → Concours.Concours.id
```

---

## 📊 Statistiques Complètes

### Nombres
- **Total Tables**: 38
- **Total Colonnes**: ~250+
- **Total Indices**: 50+
- **ENUMs**: 6
- **Arrays**: 2

### Distribution par Service
```
Auth            ███████░░ 9 tables   (24%)
Concours        ██████░░░ 7 tables   (18%)
Dossier         ██████░░░ 7 tables   (18%)
Convocation     ███████░░ 8 tables   (21%)
Notification    ██████░░░ 7 tables   (18%)
```

### Type de Tables
```
Données principales  ████████████████ 15 tables  (39%)
Historique           ████████░░░░░░░░  5 tables  (13%)
Associations         ███████░░░░░░░░░  4 tables  (11%)
Configurations       ███████░░░░░░░░░  4 tables  (11%)
Queues/Logs          ███████░░░░░░░░░  4 tables  (11%)
Reference/Enums      ████░░░░░░░░░░░░  2 tables  (5%)
Audit trail          ████░░░░░░░░░░░░  2 tables  (5%)
Support              ████░░░░░░░░░░░░  2 tables  (5%)
```

---

## 🆕 Novos vs Améliorés

### Complètement NOUVEAUX (Sprint 2)
```
✨ Administrateur          (Auth)
✨ Candidate               (Auth)
✨ AffectationCandidat    (Concours)
✨ Convocation            (Convocation)
✨ PlandAccès             (Convocation)
✨ Itineraire             (Convocation)
✨ Notification           (Notification)
✨ + 12 tables support
```

### AMÉLIORÉS (Sprint 1 → Sprint 2)
```
↻ Utilisateur          (colonnes + indices)
↻ DossierCandidature   (infos pro + adresse + affectation)
↻ Document             (validation + hash + révisions)
↻ EvaluationIA         (confiance + recommendation + analyse)
```

### INCHANGÉS (Sprint 1)
```
◇ Concours            (stable, + indices)
◇ Role/Permission     (nouveau org)
```

---

## 🎯 Cas d'Usage Principaux

### 1. Inscription Candidat
```
Utilisateur → Candidat → [attente dossier]
```

### 2. Gestion Dossier
```
Dossier → Document → [IA analyse] → Evaluation → [admin valide]
```

### 3. Affectation
```
Dossier VALIDE → AffectationCandidat → Specialite → [admin assigne]
```

### 4. Convocation
```
Affectation → Convocation → Plan d'Accès → [send email/SMS]
```

### 5. Présence
```
Convocation → Verification_QR_Code → Presence → [enregistrement]
```

### 6. Notifications
```
[Event] → Notification → Preference → Template → [Queue] → [Send]
```

---

## 🔄 Cycle de Vie: Du = Dossier à la Présence

```
┌─────────────────────────────────────────────────────────────┐
│  1. INSCRIPTION                                             │
│  └─► Utilisateur + Candidate CREATED                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ candidat_id
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SOUMISSION DOSSIER                                     │
│  └─► Dossier_Candidature CREATED (statut: EN_ATTENTE)     │
│  └─► Document CREATED + Upload fichiers                   │
│  └─► Tache_Analyse_IA CREATED → RabbitMQ Queue            │
└──────────────────────┬──────────────────────────────────────┘
                       │ async processing
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ANALYSE IA                                             │
│  └─► Evaluation_IA CREATED (scores + anomalies)           │
│  └─► Dossier_Candidature statut → s'il OK                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ admin validation
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VALIDATION ADMIN                                       │
│  └─► Validation_Manuelle CREATED (decision)               │
│  └─► Dossier_Candidature statut → VALIDE ou REJETE        │
└──────────────────────┬──────────────────────────────────────┘
            VALIDE     │ REJETE
                       │ [FIN]
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. AFFECTATION                                            │
│  └─► AffectationCandidat CREATED                          │
│  └─► Centre examen + Salle assignés                       │
│  └─► Affectation_Specialite (choix)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ admin trigger
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. GÉNÉRATION CONVOCATION                                │
│  └─► Convocation CREATED + PDF + QR Code                  │
│  └─► Document_Convocation CREATED                         │
│  └─► Notification QUEUED (email + SMS)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ async send
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. ENVOI NOTIFICATIONS                                   │
│  └─► Email + SMS envoyés au candidat                      │
│  └─► Log_Notification CREATED (succès/échec)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ candidat reçoit convocation
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  8. ARRIVÉE AU CENTRE                                      │
│  └─► Scanne Code QR                                       │
│  └─► Verification_QR_Code CREATED (check-in)             │
│  └─► Affichage: "Bienvenue Ahmed BENALIA"                │
└──────────────────────┬──────────────────────────────────────┘
                       │ admin action
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  9. PRÉSENCE ENREGISTRÉE                                   │
│  └─► Presence_Examen CREATED (PRESENT/ABSENT/EN_RETARD)  │
│  └─► FIN du cycle                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Croissance des Données

```
Sprint 1 Tables:    13
Sprint 2 Tables:    38  (+192%)

Sprint 1 Colonnes:  ~100
Sprint 2 Colonnes:  ~250   (+150%)

Sprint 1 Enums:     2
Sprint 2 Enums:     6  (+200%)

Sprint 1 Relations: 5
Sprint 2 Relations: 20  (+300%)
```

---

**📌 Version:** Sprint 2.0  
**📅 Date:** April 13, 2026  
**✅ Status:** Prêt pour implémentation  
**👤 Créé par:** Assistant AI  
