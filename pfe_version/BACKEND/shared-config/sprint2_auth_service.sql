-- ============================================================================
-- Sprint 2 - Auth Service Database Schema
-- Base de données: residanat_auth (postgres-auth)
-- ============================================================================

-- ============================================================================
-- 1. TABLE: Utilisateur (améliorée depuis Sprint 1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS utilisateur (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CANDIDAT', 'ADMIN', 'SUPER_ADMIN')),
    civilite VARCHAR(10),
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    date_naissance DATE,
    lieu_naissance VARCHAR(255),
    nationalite VARCHAR(100),
    adresse VARCHAR(500),
    cin VARCHAR(20) UNIQUE,
    type_document_identite VARCHAR(50),
    telephone VARCHAR(20),
    faculte VARCHAR(255),
    date_diplome DATE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_utilisateur_email ON utilisateur(email);
CREATE INDEX idx_utilisateur_cin ON utilisateur(cin);
CREATE INDEX idx_utilisateur_role ON utilisateur(role);

-- ============================================================================
-- 2. TABLE: Administrateur (nouveau pour Sprint 2)
-- Gère les administrateurs du ministère avec permissions spécifiques
-- ============================================================================
CREATE TABLE IF NOT EXISTS administrateur (
    id BIGSERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    cin VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    civilite VARCHAR(10),
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT '{}',  -- Array of permission strings
    departement VARCHAR(255),
    telephone VARCHAR(20),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE INDEX idx_administrateur_email ON administrateur(email);
CREATE INDEX idx_administrateur_cin ON administrateur(cin);
CREATE INDEX idx_administrateur_role ON administrateur(role);

-- ============================================================================
-- 3. TABLE: Candidate (nouveau pour Sprint 2)
-- Entité spécialisée pour les candidates avec informations additionnelles
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate (
    id BIGSERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    cin VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    date_naissance DATE,
    lieu_naissance VARCHAR(255),
    nationalite VARCHAR(100),
    adresse VARCHAR(500),
    faculte VARCHAR(255),
    telephone VARCHAR(20),
    type_identifiant VARCHAR(50),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE INDEX idx_candidate_email ON candidate(email);
CREATE INDEX idx_candidate_cin ON candidate(cin);
CREATE INDEX idx_candidate_utilisateur_id ON candidate(utilisateur_id);

-- ============================================================================
-- 4. TABLE: Rôles et Permissions (pour gestion des droits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(500),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(500),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permission (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. Données initiales - Rôles
-- ============================================================================
INSERT INTO role (nom, description) VALUES
    ('CANDIDAT', 'Rôle pour les candidats aux concours'),
    ('ADMIN_LOCAL', 'Administrateur local du ministère'),
    ('ADMIN_CENTRAL', 'Administrateur central'),
    ('SUPER_ADMIN', 'Super administrateur avec accès total')
ON CONFLICT (nom) DO NOTHING;

-- ============================================================================
-- 6. Données initiales - Permissions
-- ============================================================================
INSERT INTO permission (nom, description) VALUES
    ('READ_CANDIDATS', 'Voir les candidats'),
    ('VALIDATE_CANDIDATS', 'Valider les dossiers des candidats'),
    ('REJECT_CANDIDATS', 'Rejeter les dossiers des candidats'),
    ('MANAGE_ADMINS', 'Gérer les administrateurs'),
    ('VIEW_STATISTICS', 'Voir les statistiques'),
    ('EXPORT_DATA', 'Exporter les données'),
    ('MANAGE_CONCOURS', 'Gérer les concours'),
    ('MANAGE_CONVOCATIONS', 'Gérer les convocations'),
    ('VIEW_NOTIFICATIONS', 'Voir les notifications')
ON CONFLICT (nom) DO NOTHING;

-- ============================================================================
-- 7. Audit Log pour traçer les actions des administrateurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    administrateur_id BIGINT,
    action VARCHAR(255) NOT NULL,
    entite VARCHAR(100),
    entite_id BIGINT,
    ancienne_valeur TEXT,
    nouvelle_valeur TEXT,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_adresse VARCHAR(45),
    FOREIGN KEY (administrateur_id) REFERENCES administrateur(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_log_date ON audit_log(date_action);
CREATE INDEX idx_audit_log_admin ON audit_log(administrateur_id);
