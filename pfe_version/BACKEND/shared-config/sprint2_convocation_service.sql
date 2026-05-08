-- ============================================================================
-- Sprint 2 - Convocation Service Database Schema
-- Base de données: residanat_convocation_db (postgres-convocation)
-- ============================================================================

-- ============================================================================
-- 1. ENUM: StatutConvocation
-- ============================================================================
CREATE TYPE statut_convocation AS ENUM (
    'PLANIFIEE',
    'EN_COURS',
    'TERMINEE',
    'ANNULEE',
    'REPORTEE'
);

-- ============================================================================
-- 2. TABLE: Convocation (nouveau pour Sprint 2)
-- Gère les convocations pour les examens du concours
-- ============================================================================
CREATE TABLE IF NOT EXISTS convocation (
    id BIGSERIAL PRIMARY KEY,
    affectation_candidat_id BIGINT NOT NULL,  -- ID depuis concours-service (transient)
    candidat_id BIGINT NOT NULL,              -- ID du candidat depuis auth-service (transient)
    concours_id BIGINT NOT NULL,              -- ID du concours depuis concours-service (transient)
    numero_convocation VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(255),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    statut statut_convocation DEFAULT 'PLANIFIEE',
    centre_examen_id BIGINT,                  -- Référence au centre d'examen
    salle_examen VARCHAR(100),
    numero_place INTEGER,
    lien_qr_code VARCHAR(500),  -- URL du code QR pour vérification
    date_envoi_email TIMESTAMP,
    email_envoye BOOLEAN DEFAULT FALSE,
    sms_envoye BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_convocation_candidat ON convocation(candidat_id);
CREATE INDEX idx_convocation_concours ON convocation(concours_id);
CREATE INDEX idx_convocation_statut ON convocation(statut);
CREATE INDEX idx_convocation_numero ON convocation(numero_convocation);
CREATE INDEX idx_convocation_date_debut ON convocation(date_debut);

-- ============================================================================
-- 3. TABLE: PlandAccès (nouveau pour Sprint 2)
-- Gère les plans d'accès et les informations de localisation des centres
-- Permet la visualisation 3D/cartographique des facultés et centres
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_acces (
    id BIGSERIAL PRIMARY KEY,
    centre_examen_id BIGINT NOT NULL,
    nom_faculte VARCHAR(255) NOT NULL,
    chemin_fichier VARCHAR(500),  -- Path to PDF/image file
    url_plan VARCHAR(500),        -- URL to interactive plan
    coordonnees_gps VARCHAR(100), -- Format: "lat,lng"
    adresse_complete VARCHAR(500),
    quartier VARCHAR(255),
    ville VARCHAR(100),
    province VARCHAR(100),
    gouvernorat VARCHAR(100),
    code_postal VARCHAR(20),
    telephone_centre VARCHAR(20),
    email_centre VARCHAR(255),
    informations_transport TEXT,  -- Directions pour transports en commun
    parking_disponible BOOLEAN DEFAULT FALSE,
    informations_supplementaires TEXT,  -- Autres infos utiles
    affichage_emergent BOOLEAN DEFAULT TRUE,  -- Affichage prioritaire
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_acces_centre ON plan_acces(centre_examen_id);
CREATE INDEX idx_plan_acces_ville ON plan_acces(ville);
CREATE INDEX idx_plan_acces_gouvernorat ON plan_acces(gouvernorat);

-- ============================================================================
-- 4. TABLE: Itinéraire/Directions (pour chaque centre)
-- ============================================================================
CREATE TABLE IF NOT EXISTS itineraire (
    id BIGSERIAL PRIMARY KEY,
    plan_acces_id BIGINT NOT NULL,
    mode_transport VARCHAR(50),  -- AUTO, BUS, METRO, A_PIED
    description TEXT,
    duree_estimee INTEGER,  -- en minutes
    cout_estime DECIMAL(10, 2),
    instructions TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_acces_id) REFERENCES plan_acces(id) ON DELETE CASCADE
);

CREATE INDEX idx_itineraire_plan ON itineraire(plan_acces_id);

-- ============================================================================
-- 5. TABLE: Documents Convocation (fichiers générés)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_convocation (
    id BIGSERIAL PRIMARY KEY,
    convocation_id BIGINT NOT NULL,
    nom_document VARCHAR(255),
    type_document VARCHAR(50),  -- PDF, QR_CODE, etc.
    chemin_fichier VARCHAR(500),
    date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_suppression TIMESTAMP,
    FOREIGN KEY (convocation_id) REFERENCES convocation(id) ON DELETE CASCADE
);

CREATE INDEX idx_doc_convocation_convocation ON document_convocation(convocation_id);

-- ============================================================================
-- 6. TABLE: Vérification QR Code
-- Enregistre les vérifications des codes QR (check-in)
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_qr_code (
    id BIGSERIAL PRIMARY KEY,
    convocation_id BIGINT NOT NULL,
    candidat_id BIGINT NOT NULL,
    date_verification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut_verification VARCHAR(50),  -- VALIDE, INVALIDE, EXPIRE
    ip_adresse VARCHAR(45),
    appareil_used VARCHAR(255),
    FOREIGN KEY (convocation_id) REFERENCES convocation(id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_convocation ON verification_qr_code(convocation_id);
CREATE INDEX idx_verification_candidat ON verification_qr_code(candidat_id);
CREATE INDEX idx_verification_date ON verification_qr_code(date_verification);

-- ============================================================================
-- 7. TABLE: Absence/Présence aux Examens
-- ============================================================================
CREATE TABLE IF NOT EXISTS presence_examen (
    id BIGSERIAL PRIMARY KEY,
    convocation_id BIGINT NOT NULL,
    candidat_id BIGINT NOT NULL,
    statut_presence VARCHAR(50) CHECK (statut_presence IN ('PRESENT', 'ABSENT', 'EN_RETARD')),
    heure_arrivee TIMESTAMP,
    heure_depart TIMESTAMP,
    observations TEXT,
    date_enregistrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convocation_id) REFERENCES convocation(id) ON DELETE CASCADE
);

CREATE INDEX idx_presence_convocation ON presence_examen(convocation_id);
CREATE INDEX idx_presence_candidat ON presence_examen(candidat_id);

-- ============================================================================
-- 8. TABLE: Modifications/Reports de Convocation
-- ============================================================================
CREATE TABLE IF NOT EXISTS historique_convocation (
    id BIGSERIAL PRIMARY KEY,
    convocation_id BIGINT NOT NULL,
    ancien_statut statut_convocation,
    nouveau_statut statut_convocation,
    ancienne_date_debut DATE,
    nouvelle_date_debut DATE,
    ancienne_date_fin DATE,
    nouvelle_date_fin DATE,
    ancien_centre VARCHAR(255),
    nouveau_centre VARCHAR(255),
    raison_modification TEXT,
    modified_by BIGINT,  -- ID administrateur
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (convocation_id) REFERENCES convocation(id) ON DELETE CASCADE
);

CREATE INDEX idx_hist_convocation_date ON historique_convocation(date_modification);
