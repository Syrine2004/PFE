# 📡 Guide des Interactions entre Microservices - Sprint 2

## 🎯 Flux Principal: Inscription → Affectation → Convocation → Notification

---

## 1️⃣ INSCRIPTION ET CRÉATION CANDIDAT

### Flux:
```
Frontend (Angular)
    ↓ POST /api/auth/register
API Gateway (8080)
    ↓ Route To
Auth Service (8081)
    ├─ CREATE Utilisateur (candidat_id: 1)
    └─ CREATE Candidate (candidat_id: 1)
    ↓ Response
Frontend: "Inscription confirmée"
```

### API Call:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "candidat@test.tn",
  "motDePasse": "secure_password",
  "nom": "Benalia",
  "prenom": "Ahmed",
  "cin": "12345678",
  "nationalite": "Tunisienne",
  "faculte": "FMDT",
  "telephone": "+216 2X XXX XXX"
}
```

### Database:
```sql
-- Auth Service DB
INSERT INTO utilisateur (email, mot_de_passe, role, nom, prenom, cin, nationalite, faculte)
VALUES ('candidat@test.tn', '...hash...', 'CANDIDAT', 'Benalia', 'Ahmed', '12345678', 'Tunisienne', 'FMDT');
-- candidat_id := 1

INSERT INTO candidate (utilisateur_id, cin, email, nom, prenom, faculte)
VALUES (1, '12345678', 'candidat@test.tn', 'Benalia', 'Ahmed', 'FMDT');
```

---

## 2️⃣ SOUMISSION DOSSIER

### Flux:
```
Frontend
    ↓ POST /api/dossier/upload
API Gateway
    ↓
Dossier Service (8084)
    ├─ CREATE Dossier_Candidature
    │   (candidat_id=1, concours_id=1)
    │
    ├─ CREATE Document (type: CIN, DIPLOME, PHOTO)
    │   +Upload fichier au stockage
    │
    ├─ Créer Tache_Analyse_IA
    │   (send async message à IA Service)
    │
    └─ QUEUE → IA Service (via RabbitMQ)
```

### Database:
```sql
-- Dossier Service DB
INSERT INTO dossier_candidature 
  (candidat_id, concours_id, numero_dossier, statut, date_soumission)
VALUES 
  (1, 1, 'DSS-2025-00001', 'EN_ATTENTE', NOW());
-- dossier_id := 1

INSERT INTO document (dossier_id, nom, type_document, chemin_fichier, date_upload)
VALUES 
  (1, 'cin_ahmed.pdf', 'CIN', '/uploads/cin/...', NOW()),
  (1, 'diplome_ahmed.pdf', 'DIPLOME', '/uploads/diplome/...', NOW()),
  (1, 'photo_ahmed.jpg', 'PHOTO_IDENTITE', '/uploads/photos/...', NOW());

INSERT INTO tache_analyse_ia (dossier_id, type_analyse, statut)
VALUES (1, 'GLOBAL', 'EN_ATTENTE');
```

---

## 3️⃣ ANALYSE IA

### Flux:
```
IA Service (Python/ML) (8085)
    ├─ Récupère Tache_Analyse_IA depuis queue
    │
    ├─ Analyse documents (CIN, DIPLOME, PHOTO)
    │   └─ EasyOCR + Validations
    │
    ├─ Génère scores et anomalies
    │
    └─ UPDATE Evaluation_IA
        └─ Envoie résultat via API
```

### Database:
```sql
-- Dossier Service DB
INSERT INTO evaluation_ia 
  (dossier_id, score, score_cin, score_diplome, score_photo, anomalies, verifie, date_evaluation)
VALUES 
  (1, 95.5, 98.0, 96.0, 92.0, 'Aucune anomalie', FALSE, NOW());

UPDATE dossier_candidature 
SET score_ia_global = 95.5, statut_verification_ia = 'COMPLETEE'
WHERE id = 1;

UPDATE tache_analyse_ia 
SET statut = 'TERMINEE', resultat_evaluation_id = 1
WHERE id = 1;
```

---

## 4️⃣ VALIDATION MANUELLE (ADMIN)

### Flux:
```
Admin Dashboard (Frontend)
    ↓ Via Admin Panel
API Gateway
    ├─ Auth Service: Vérifie admin
    │
    └─ Dossier Service: UPDATE status
        └─ CREATE Validation_Manuelle (audit)
```

### API Call:
```http
POST /api/admin/dossier/1/valider
Authorization: Bearer {JWT_ADMIN_TOKEN}

{
  "decision": "APPROUVER",
  "commentaire": "Tous les documents conformes"
}
```

### Database:
```sql
-- Dossier Service DB
INSERT INTO validation_manuelle 
  (dossier_id, administrateur_id, decision, commentaire, date_validation)
VALUES 
  (1, 5, 'APPROUVER', 'Tous les documents conformes', NOW());

UPDATE evaluation_ia 
SET verifie = TRUE 
WHERE dossier_id = 1;
```

---

## 5️⃣ AFFECTATION DU CANDIDAT

### Flux (Déclenché par Admin):
```
Admin Panel
    ↓ POST /api/admin/affectation/bulk
API Gateway
    │
    ├─ Auth Service
    │   └─ Récupère candidat_id (vérification)
    │
    ├─ Concours Service
    │   └─ Crée AffectationCandidat
    │   └─ Assigne centre d'examen
    │   └─ Assigne spécialité
    │
    ├─ Notification Service
    │   └─ Enqueue notification "AFFECTATION_CONFIRMEE"
    │
    └─ RabbitMQ → Notification Queue
```

### API Call (Bulk):
```http
POST /api/admin/concours/1/affectation/bulk
Authorization: Bearer {JWT_ADMIN_TOKEN}

{
  "candidat_ids": [1, 2, 3, 4, 5],
  "centre_examen_id": 2,
  "specialite_id": 10
}
```

### Database:
```sql
-- Concours Service DB
INSERT INTO affectation_candidat 
  (candidat_id, dossier_id, concours_id, statut_dossier, centre_examen_id, salle_examen)
VALUES 
  (1, 1, 1, 'AFFECTE', 2, 'A101');
-- affectation_id := 1

INSERT INTO affectation_specialite 
  (affectation_candidat_id, specialite_id, choix_ordre)
VALUES 
  (1, 10, 1);

INSERT INTO historique_statut_dossier 
  (affectation_candidat_id, ancien_statut, nouveau_statut, date_changement)
VALUES 
  (1, 'VALIDE', 'AFFECTE', NOW());
```

---

## 6️⃣ GÉNÉRATION CONVOCATION

### Flux (Automatisé ou Manuel):
```
Admin Panel / Batch Job
    ├─ POST /api/admin/convocation/generer
    │
    ├─ Récupère:
    │   ├─ AffectationCandidat (Concours Service)
    │   ├─ Candidat info (Auth Service)
    │   ├─ PlandAccès (Convocation Service)
    │   └─ Préférences notification (Notification Service)
    │
    ├─ Convocation Service
    │   └─ CREATE Convocation
    │   └─ Génère QR Code (PDF)
    │   └─ Crée Document_Convocation
    │
    └─ Notification Service
        └─ Enqueue: EMAIL + SMS
```

### Database:
```sql
-- Convocation Service DB
INSERT INTO convocation 
  (affectation_candidat_id, candidat_id, concours_id, numero_convocation, 
   libelle, date_debut, date_fin, heure_debut, statut, centre_examen_id, 
   salle_examen, numero_place, lien_qr_code)
VALUES 
  (1, 1, 1, 'CONV-2025-000001', 'Examen Résidanat 2025',
   '2025-06-15', '2025-06-15', '09:00', 'PLANIFIEE', 2, 'A101', 42,
   'https://api.residanat.tn/qr/CONV-2025-000001');
-- convocation_id := 1

INSERT INTO document_convocation 
  (convocation_id, nom_document, type_document, chemin_fichier)
VALUES 
  (1, 'convocation_scan.pdf', 'PDF', '/documents/convocations/...'),
  (1, 'qrcode_convocation.png', 'QR_CODE', '/qrcodes/...');
```

---

## 7️⃣ ENVOI NOTIFICATIONS

### Flux:
```
Notification Service
    ├─ Poll Notification_Queue
    │
    ├─ Pour chaque notification EN_ATTENTE:
    │   ├─ Récupère Preference_Notification_Candidat
    │   ├─ Sélectionne canaux (EMAIL, SMS)
    │   ├─ Récupère Template_Notification
    │   ├─ Remplace variables ({candidat_nom}, {num_convocation})
    │   │
    │   ├─ Canal EMAIL:
    │   │   └─ SendGrid API → Email Préparé
    │   │
    │   ├─ Canal SMS:
    │   │   └─ Twilio API → SMS Préparé
    │   │
    │   └─ Enregistre dans Log_Notification
    │
    └─ UPDATE Notification (statut = ENVOYEE, date_envoi_reel)
```

### Database:
```sql
-- Notification Service DB
INSERT INTO notification 
  (candidat_id, type_notification_id, canal, sujet, message, statut, 
   destinataire_email, destinataire_telephone, convocation_id, 
   date_prevue_envoi)
VALUES 
  (1, 5, 'EMAIL', 'Convocation Examen Résidanat 2025', 
   'Vous êtes convoqué...', 'EN_ATTENTE',
   'candidat@test.tn', '+216 2X XXX XXX', 1, NOW());
-- notification_id := 1

INSERT INTO notification_queue (notification_id, statut, nb_tentatives)
VALUES (1, 'PENDING', 0);

-- Après envoi réussi:
UPDATE notification 
SET statut = 'ENVOYEE', date_envoi_reel = NOW(), email_envoye = TRUE
WHERE id = 1;
```

---

## 8️⃣ VÉRIFICATION CODE QR (Au centre d'examen)

### Flux:
```
Candidat arrive au centre
    ↓ Scanne code QR depuis convocation
    ↓ Vers: https://api.residanat.tn/qr/CONV-2025-000001
    │
API Gateway
    ├─ Convocation Service
    │   └─ Récupère Convocation
    │   └─ Valide statut & date/heure
    │   ├─ CREATE Verification_QR_Code
    │   └─ Affiche: "Bienvenue Ahmed BENALIA"
    │
    └─ Retour Frontend (QR Page)
        └─ Affiche infos + Check-in réussi
```

### Database:
```sql
-- Convocation Service DB
INSERT INTO verification_qr_code 
  (convocation_id, candidat_id, date_verification, statut_verification, ip_adresse, appareil_used)
VALUES 
  (1, 1, NOW(), 'VALIDE', '192.168.1.210', 'iPad Pro');
```

---

## 9️⃣ ENREGISTREMENT PRÉSENCE

### Flux:
```
Admin à salle d'examen
    ├─ Scanne badge/Cherche candidat
    └─ Enregistre présence
    
Présence Service (Convocation DB)
    ├─ CREATE Presence_Examen
    │   statut: PRESENT / ABSENT / EN_RETARD
    │
    └─ Potentiellement:
        ├─ Notifier Notification Service
        └─ Envoyer EMAIL/SMS de confirmation
```

### Database:
```sql
-- Convocation Service DB
INSERT INTO presence_examen 
  (convocation_id, candidat_id, statut_presence, heure_arrivee, observations)
VALUES 
  (1, 1, 'PRESENT', '08:45', NULL);
```

---

## 🔄 Modèle de Communication: REQUEST-RESPONSE vs MESSAGE QUEUE

### 1. REQUEST-RESPONSE (Synchronous)
```
Frontend ──HTTP──► API Gateway ──gRPC──► Concours Service
                                          ↓
                                      Auth Service (vérif)
                                          ↓
                                   Response (JSON)
↑────────────────────────────────────────────────
```
**Utilisé pour:** Lectures, affectations, validations

### 2. MESSAGE QUEUE (Asynchronous)
```
Dossier Service ──MSG──► RabbitMQ ──MSG──► IA Service
                                           (process async)
                                             ↓
                         IA Service ──API──► Dossier Service
                         (résultats)
```
**Utilisé pour:** Analyses IA, envoi notifications, tâches longues

---

## 📊 Matrice des Interactions

| From | To | Method | Use Case |
|------|----|---------|-|
| Frontend | Auth | HTTP POST | Register, Login |
| Frontend | Dossier | HTTP POST/PUT | Upload docs |
| Frontend | Concours | HTTP GET | List concours |
| Frontend | Convocation | HTTP GET | View convocation |
| Dossier | IA (async) | Message Queue | Analyse documents |
| Dossier | Notification | HTTP POST | Alert après validation |
| Concours | Dossier | HTTP GET | Récupère scores IA |
| Concours | Notification | Message Queue | Affectation notification |
| Convocation | Notification | Message Queue | Envoi convocation |
| Admin | Tous Services | HTTP (JWT) | Opérations admin |
| IA | Dossier | HTTP PUT | Retour résultats |

---

## 🔐 Sécurité & Token JWT

Chaque service API est protégé par JWT:

```http
GET /api/dossier/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "userId": 1,
  "email": "candidat@test.tn",
  "role": "CANDIDAT",
  "service": "auth-service",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Validations JWT par service:
- **Auth Service**: Émet JWT
- **API Gateway**: Valide JWT avant routing
- **Autres Services**: Valident JWT pour autoriser requête

---

## 🚀 Exemple Complet: Flux Fin-à-Fin

```
1. Candidat s'inscrit
   POST /register
   → Utilisateur.id = 1

2. Candidat upload dossier
   POST /dossier/upload
   → Dossier.id = 1
   → Lance Tache_Analyse_IA

3. IA analyse
   Queue message
   → Evaluation_IA.score = 95

4. Admin valide
   POST /admin/dossier/1/valider
   → Validation_Manuelle.id = 1

5. Admin affecte en masse
   POST /affectation/bulk
   → Affectation_Candidat.id = 1
   → Historique_Statut_Dossier.id = 1

6. Système génère convocation
   Job scheduling
   → Convocation.id = 1
   → Document_Convocation (PDF, QR)

7. Notification envoyée
   → Notification.id = 1
   → Email + SMS au candidat

8. Candidat scanne QR dans centre
   GET /qr/CONV-2025-000001
   → Verification_QR_Code.id = 1
   → Affichage bienvenue

9. Enregistrement présence
   → Presence_Examen.id = 1
   → Status: PRESENT
```

---

## 📝 Notes Importantes

1. **Pas de transaction distribuée** - Gérer la cohérence via:
   - Saga pattern
   - Events après chaque action
   - Retry logic avec backoff

2. **Identifiants transientes** - Toujours valider avant utilisation

3. **Chronologie des opérations** - Respecter l'ordre:
   ```
   Dossier VALIDE → Affectation → Convocation → Notification
   ```

4. **Gestion erreurs** - Dead letter queue pour messages échoués

5. **Monitoring** - Tracker chaque interaction via logs

