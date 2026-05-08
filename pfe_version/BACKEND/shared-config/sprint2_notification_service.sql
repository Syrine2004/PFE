-- ============================================================================
-- Sprint 2 - Notification Service Database Schema
-- Base de données: residanat_notification_db (postgres-notification)
-- ============================================================================

-- ============================================================================
-- 1. ENUM: NotificationType
-- ============================================================================
CREATE TYPE notification_type AS ENUM (
    'INSCRIPTION_CONFIRMEE',
    'DOSSIER_REJETE',
    'DOSSIER_VALIDE',
    'DOSSIER_EN_ATTENTE',
    'CONVOCATION_AVIS',
    'RAPPEL_EXAMEN',
    'RESULTATS_AVAILABLES',
    'AFFECTATION_CONFIRMEE',
    'INFORMATION_GENERALE',
    'URGENCE'
);

-- ============================================================================
-- 2. ENUM: Canal de Notification
-- ============================================================================
CREATE TYPE canal_notification AS ENUM (
    'EMAIL',
    'SMS',
    'PUSH',
    'SITE_WEB'
);

-- ============================================================================
-- 3. ENUM: Statut Notification
-- ============================================================================
CREATE TYPE statut_notification AS ENUM (
    'EN_ATTENTE',
    'ENVOYEE',
    'LUE',
    'ECHEC',
    'ANNULEE'
);

-- ============================================================================
-- 4. TABLE: TypeNotification (Référence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS type_notification (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    template_email TEXT,         -- Template HTML pour email
    template_sms TEXT,           -- Template texte pour SMS
    template_notification TEXT,  -- Template pour notifications web
    priorite INTEGER DEFAULT 0,
    requis BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_type_notif_code ON type_notification(code);

-- ============================================================================
-- 5. TABLE: Notification (principal)
-- Gère l'envoi et le suivi des notifications aux candidats
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification (
    id BIGSERIAL PRIMARY KEY,
    candidat_id BIGINT NOT NULL,         -- ID depuis auth-service (transient)
    type_notification_id BIGINT NOT NULL,
    canal canal_notification DEFAULT 'EMAIL',
    sujet VARCHAR(255),
    message TEXT NOT NULL,
    contenu_html TEXT,                   -- Version HTML du message
    statut statut_notification DEFAULT 'EN_ATTENTE',
    
    -- Informations d'envoi
    date_prevue_envoi TIMESTAMP,
    date_envoi_reel TIMESTAMP,
    date_lecture TIMESTAMP,
    
    -- Métadonnées
    destinataire_email VARCHAR(255),
    destinataire_telephone VARCHAR(20),
    
    -- Références croisées (transientes)
    dossier_id BIGINT,                   -- ID depuis dossier-service
    convocation_id BIGINT,               -- ID depuis convocation-service
    concours_id BIGINT,                  -- ID depuis concours-service
    
    -- Suivi et erreurs
    tentatives_envoi INTEGER DEFAULT 0,
    dernier_message_erreur TEXT,
    
    -- Marquage
    est_lue BOOLEAN DEFAULT FALSE,
    est_archivee BOOLEAN DEFAULT FALSE,
    
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (type_notification_id) REFERENCES type_notification(id) ON DELETE RESTRICT
);

CREATE INDEX idx_notification_candidat ON notification(candidat_id);
CREATE INDEX idx_notification_type ON notification(type_notification_id);
CREATE INDEX idx_notification_statut ON notification(statut);
CREATE INDEX idx_notification_date_envoi ON notification(date_envoi_reel);
CREATE INDEX idx_notification_est_lue ON notification(est_lue);
CREATE INDEX idx_notification_canal ON notification(canal);

-- ============================================================================
-- 6. TABLE: Préférences Notification du Candidat
-- ============================================================================
CREATE TABLE IF NOT EXISTS preference_notification_candidat (
    id BIGSERIAL PRIMARY KEY,
    candidat_id BIGINT NOT NULL UNIQUE,
    
    -- Canaux préférés
    notification_email_active BOOLEAN DEFAULT TRUE,
    notification_sms_active BOOLEAN DEFAULT TRUE,
    notification_push_active BOOLEAN DEFAULT FALSE,
    notification_site_active BOOLEAN DEFAULT TRUE,
    
    -- Fréquence
    frequence_emails VARCHAR(50) DEFAULT 'IMMEDIATE',  -- IMMEDIATE, QUOTIDIENNE, HEBDOMADAIRE
    frequence_sms VARCHAR(50) DEFAULT 'IMMEDIATE',
    
    -- Types de notifications à recevoir
    receive_inscription BOOLEAN DEFAULT TRUE,
    receive_statut_dossier BOOLEAN DEFAULT TRUE,
    receive_convocation BOOLEAN DEFAULT TRUE,
    receive_rappel_examen BOOLEAN DEFAULT TRUE,
    receive_resultats BOOLEAN DEFAULT TRUE,
    receive_affectation BOOLEAN DEFAULT TRUE,
    receive_general_info BOOLEAN DEFAULT TRUE,
    receive_urgence BOOLEAN DEFAULT TRUE,
    
    -- Horaires (au format HH:MM)
    heure_debut_envoi TIME DEFAULT '08:00',
    heure_fin_envoi TIME DEFAULT '20:00',
    
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pref_notif_candidat ON preference_notification_candidat(candidat_id);

-- ============================================================================
-- 7. TABLE: Template Notification Personnalisé
-- Permet de créer des templates customisés par concours/admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_notification (
    id BIGSERIAL PRIMARY KEY,
    type_notification_id BIGINT NOT NULL,
    concours_id BIGINT,                  -- NULL = template global, sinon = specific à concours
    nom_template VARCHAR(255) NOT NULL,
    sujet VARCHAR(255),
    corps_template TEXT NOT NULL,
    variables_support TEXT[],            -- Variables supportées: {candidat_nom}, {concours_libelle}, etc.
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,                   -- ID administrateur
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_notification_id) REFERENCES type_notification(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_type ON template_notification(type_notification_id);
CREATE INDEX idx_template_concours ON template_notification(concours_id);

-- ============================================================================
-- 8. TABLE: Queue Notification (pour traitement asynchrone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL,
    statut VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, PROCESSING, SENT, FAILED
    nb_tentatives INTEGER DEFAULT 0,
    prochaine_tentative TIMESTAMP,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_traitement TIMESTAMP,
    error_details TEXT,
    FOREIGN KEY (notification_id) REFERENCES notification(id) ON DELETE CASCADE
);

CREATE INDEX idx_queue_statut ON notification_queue(statut);
CREATE INDEX idx_queue_prochaine_tentative ON notification_queue(prochaine_tentative);

-- ============================================================================
-- 9. TABLE: Log Envoi Notification
-- Trace détaillée de chaque envoi
-- ============================================================================
CREATE TABLE IF NOT EXISTS log_notification (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL,
    canal canal_notification,
    date_tentative TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    succes BOOLEAN,
    code_erreur VARCHAR(50),
    message_erreur TEXT,
    response_provider TEXT,  -- Réponse du provider (ex: Twilio, SendGrid)
    duree_envoi INTEGER,     -- en ms
    FOREIGN KEY (notification_id) REFERENCES notification(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_notif_date ON log_notification(date_tentative);
CREATE INDEX idx_log_notif_succes ON log_notification(succes);

-- ============================================================================
-- Données initiales - Types de Notification
-- ============================================================================
INSERT INTO type_notification (code, libelle, description, priorite) VALUES
    ('INSCRIPTION_CONFIRMEE', 'Inscription Confirmée', 'Confirmation de l''inscription au concours', 1),
    ('DOSSIER_REJETE', 'Dossier Rejeté', 'Notification de rejet du dossier', 3),
    ('DOSSIER_VALIDE', 'Dossier Validé', 'Notification de validation du dossier', 2),
    ('DOSSIER_EN_ATTENTE', 'Dossier En Attente', 'Notification de dossier en attente de validation', 1),
    ('CONVOCATION_AVIS', 'Avis de Convocation', 'Avis de convocation pour les examens', 3),
    ('RAPPEL_EXAMEN', 'Rappel Examen', 'Rappel avant la date de l''examen', 2),
    ('RESULTATS_AVAILABLES', 'Résultats Disponibles', 'Notification de résultats disponibles', 2),
    ('AFFECTATION_CONFIRMEE', 'Affectation Confirmée', 'Confirmation de l''affectation', 2),
    ('INFORMATION_GENERALE', 'Information Générale', 'Information générale pour les candidats', 0),
    ('URGENCE', 'Urgence', 'Notification urgente', 4)
ON CONFLICT (code) DO NOTHING;
