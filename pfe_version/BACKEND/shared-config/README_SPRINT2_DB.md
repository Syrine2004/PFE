# 🗄️ Sprint 2 - Base de Données - README

## 📦 Fichiers Créés

| Fichier | Description | Lignes |
|---------|-------------|--------|
| `sprint2_auth_service.sql` | Auth Service DB schema | 124 |
| `sprint2_concours_service.sql` | Concours Service DB schema | 198 |
| `sprint2_dossier_service.sql` | Dossier Service DB schema | 301 |
| `sprint2_convocation_service.sql` | Convocation Service DB schema | 167 |
| `sprint2_notification_service.sql` | Notification Service DB schema | 256 |
| `SCHEMA_SPRINT2_DOCUMENTATION.md` | Guide complet architecture | 📖 |
| `MIGRATION_SPRINT2_GUIDE.sql` | Guide déploiement & checklist | 📖 |
| `INTERACTIONS_MICROSERVICES_GUIDE.md` | Flux détaillés inter-services | 📖 |

**Total:** ~1046 lignes de SQL + documentation complète

---

## 🚀 Quick Start: Appliquer les Migrations

### Option 1: Docker Compose (Recommandé)

Les scripts SQL seront exécutés automatiquement au démarrage des conteneurs:

```bash
cd pfe_version
docker-compose up -d
```

Les BD seront initialisées avec les schémas Sprint 2.

### Option 2: Exécution Manuelle

```bash
# Attendre que les conteneurs PostgreSQL soient prêts
docker-compose up -d postgres-auth postgres-concours postgres-dossier postgres-convocation postgres-notification

# Attendre ~30 secondes

# Exécuter les migrations
psql -h localhost -p 5433 -U postgres -d residanat_auth < BACKEND/shared-config/sprint2_auth_service.sql
psql -h localhost -p 5434 -U postgres -d residanat_concours < BACKEND/shared-config/sprint2_concours_service.sql
psql -h localhost -p 5435 -U postgres -d residanat_dossier < BACKEND/shared-config/sprint2_dossier_service.sql
psql -h localhost -p 5436 -U postgres -d residanat_convocation < BACKEND/shared-config/sprint2_convocation_service.sql
psql -h localhost -p 5437 -U postgres -d residanat_notification < BACKEND/shared-config/sprint2_notification_service.sql
```

### Option 3: Script Wrapper (En Bash/PowerShell)

```bash
#!/bin/bash
for sql in sprint2_*.sql; do
    PORT=$(grep -oP ':\K\d+' <<< "$sql" | head -1)
    DB=$(grep -oP 'residanat_\K\w+' <<< "$sql" | head -1)
    echo "Applying $sql to $DB..."
    psql -h localhost -p $PORT -U postgres -d residanat_$DB < "$sql"
done
```

---

## 📋 Architecture à un Coup d'Œil

```
┌──────────────────────────────────┐
│     AUTH SERVICE (8081)          │
│  ├─ Utilisateur                  │
│  ├─ Administrateur (NEW)         │
│  ├─ Candidate (NEW)              │
│  ├─ Role / Permission            │
│  └─ AuditLog                     │
└──────────────┬───────────────────┘
               │ candidat_id
               ▼
┌──────────────────────────────────┐
│   CONCOURS SERVICE (8082)        │
│  ├─ Concours                     │
│  ├─ AffectationCandidat (NEW)   │
│  ├─ CentreExamen                │
│  ├─ Specialite                  │
│  └─ Affectation_Specialite      │
└──────────────┬───────────────────┘
               │ dossier_id
               ▼
┌──────────────────────────────────┐
│   DOSSIER SERVICE (8084)         │
│  ├─ Dossier_Candidature          │
│  ├─ Document (amélioré)          │
│  ├─ Evaluation_IA (amélioré)     │
│  ├─ Tache_Analyse_IA            │
│  └─ Validation_Manuelle        │
└──────────────┬───────────────────┘
               │ affectation_id
               ▼
┌──────────────────────────────────┐
│   CONVOCATION SERVICE (8086)     │
│  ├─ Convocation (NEW)            │
│  ├─ PlandAccès (NEW)             │
│  ├─ Itineraire (NEW)             │
│  ├─ Verification_QR_Code         │
│  ├─ Presence_Examen              │
│  └─ Document_Convocation         │
└──────────────┬───────────────────┘
               │ notification
               ▼
┌──────────────────────────────────┐
│   NOTIFICATION SERVICE (8087)    │
│  ├─ Notification (NEW)           │
│  ├─ Type_Notification            │
│  ├─ Preference (NEW)             │
│  ├─ Template (NEW)               │
│  ├─ Queue (NEW)                  │
│  └─ Log (NEW)                    │
└──────────────────────────────────┘
```

---

## 🔑 Points Clés de l'Architecture

### 1. Microservices Indépendants
- ✅ Chaque service = sa propre BD
- ✅ Pas de dépendances directes
- ✅ Communication via APIs + Message Queue

### 2. Identifiants Transientes
```sql
-- Example: Affectation_Candidat
candidat_id BIGINT NOT NULL,      -- From Auth Service (no FK)
dossier_id BIGINT NOT NULL,       -- From Dossier Service (no FK)
concours_id BIGINT NOT NULL,      -- Local FK
```

### 3. ENUMs PostgreSQL
```sql
CREATE TYPE statut_dossier AS ENUM ('EN_ATTENTE', 'VALIDE', 'REJETE', 'AFFECTE', 'CONVOQUE');
```

### 4. Audit & Traçabilité
```sql
-- Tables:
- historique_*
- audit_log
- validation_manuelle
- log_notification
- verification_qr_code
```

---

## 📊 Statistiques

### Nombres de Tables
- **Auth Service**: 9 tables
- **Concours Service**: 7 tables
- **Dossier Service**: 7 tables
- **Convocation Service**: 8 tables
- **Notification Service**: 7 tables
- **TOTAL**: ~38 tables

### Types de Données
- **ENUMs**: 6 types PostgreSQL
- **Arrays**: 2 types (permissions[], liste_anomalies[])
- **Indices**: ~50+ pour performance

### Nouvelles Entités (Sprint 2)
- Administrateur
- Candidate
- AffectationCandidat
- Convocation
- PlandAccès  
- Notification
- + 15 tables de support

---

## 🔄 Flux Principal: Inscription → Convocation → Notification

```
1. INSCRIPTION
   └─ Frontend POST /register
   └─ Auth Service: CREATE Utilisateur + Candidate

2. SOUMISSION DOSSIER
   └─ Frontend POST /dossier/upload
   └─ Dossier Service: CREATE Dossier + Document
   └─ Queue → IA Service (analyse async)

3. ANALYSE IA
   └─ IA Service: EvaluationIA (OCR + Validations)
   └─ Retour score + anomalies

4. VALIDATION ADMIN
   └─ Admin Dashboard: Approuve/Rejette dossier
   └─ Dossier Service: UPDATE validation_manuelle

5. AFFECTATION
   └─ Admin: Bulk assignment à centres/spécialités
   └─ Concours Service: CREATE AffectationCandidat

6. CONVOCATION
   └─ Auto/Manual trigger
   └─ Convocation Service: CREATE Convocation + QR PDF

7. NOTIFICATIONS
   └─ Notification Service: Queue EMAIL + SMS
   └─ Candidat reçoit convocation

8. VÉRIFICATION QR
   └─ Candidat scanne au centre
   └─ Convocation Service: CREATE verification_qr_code

9. PRÉSENCE
   └─ Admin enregistre présence
   └─ Convocation Service: CREATE presence_examen
```

---

## 📖 Documentation Complète

Pour des détails approfondis, consultez:

1. **SCHEMA_SPRINT2_DOCUMENTATION.md**
   - Architecture détaillée
   - Diagrammes relations
   - Stratégie identification transiente
   - Migration Sprint 1 → Sprint 2

2. **MIGRATION_SPRINT2_GUIDE.sql**
   - Checklist implémentation
   - Structure microservices
   - Enums de référence
   - Scripts déploiement

3. **INTERACTIONS_MICROSERVICES_GUIDE.md**
   - Flux fin-à-fin
   - Exemples API calls
   - Database updates
   - Communication patterns

---

## ✅ Checklist Avant Déploiement

- [ ] Tous les scripts SQL appliqués
- [ ] RabbitMQ démarré et configuré
- [ ] PostgreSQL tous les ports accessibles
- [ ] Vérifier les logs d'erreur lors du démarrage
- [ ] Tester quelques API calls simples
- [ ] Vérifier indices créés: `SELECT * FROM pg_indexes;`
- [ ] Backup configuration ready
- [ ] Monitoring/Logging configuré

---

## 🚨 Troubleshooting

### "Column does not exist"
- Vérifier que tous les scripts ont été exécutés
- Vérifier les noms de tables/colonnes (case-sensitive)

### "FK violation"
- Vérifier que les IDs transientes sont valides
- Interroger directement les tables des autres services

### "Queue error"
- Vérifier RabbitMQ est actif
- Vérifier connection strings dans env variables

### Performances
- Lancer: `ANALYZE;` après migration
- Vérifier EXPLAIN PLAN pour requêtes lentes

---

## 📞 Support

Pour questions sur:
- **Schema**: Voir SCHEMA_SPRINT2_DOCUMENTATION.md
- **Migrations**: Voir MIGRATION_SPRINT2_GUIDE.sql
- **Flux**: Voir INTERACTIONS_MICROSERVICES_GUIDE.md

---

**Créé:** April 13, 2026  
**Version:** Sprint 2.0  
**Status:** ✅ Prêt pour déploiement
