-- ============================================================================
-- Sprint 2 - Concours Service Database Schema
-- Base de données: residanat_concours_db (postgres-concours)
-- ============================================================================

-- ============================================================================
-- 1. ENUM: StatutDossier
-- ============================================================================
CREATE TYPE statut_dossier AS ENUM (
    'EN_ATTENTE',
    'VALIDE',
    'REJETE',
    'AFFECTE',
    'CONVOQUE'
);

-- ============================================================================
-- 2. TABLE: Concours (existante, améliorée)
-- ============================================================================
CREATE TABLE IF NOT EXISTS concours (
    id BIGSERIAL PRIMARY KEY,
    type_concours VARCHAR(100) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    annee INTEGER NOT NULL,
    etat VARCHAR(50) CHECK (etat IN ('PLANIFIEE', 'OUVERT', 'FERME', 'ANNULE')),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,  -- ID de l'administrateur qui a créé
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_places INTEGER,
    session_id VARCHAR(100)
);

CREATE INDEX idx_concours_annee ON concours(annee);
CREATE INDEX idx_concours_etat ON concours(etat);
CREATE INDEX idx_concours_type ON concours(type_concours);

-- ============================================================================
-- 3. TABLE: AffectationCandidat (nouveau pour Sprint 2)
-- Gère l'affectation des candidats aux centres d'examen/facultés
-- Établit le lien entre candidat, dossier, concours et statut
-- ============================================================================
CREATE TABLE IF NOT EXISTS affectation_candidat (
    id BIGSERIAL PRIMARY KEY,
    candidat_id BIGINT NOT NULL,  -- ID du candidat depuis auth-service
    dossier_id BIGINT NOT NULL,   -- ID du dossier depuis dossier-service (transient)
    concours_id BIGINT NOT NULL,
    statut_dossier statut_dossier DEFAULT 'EN_ATTENTE',
    centre_examen VARCHAR(255),   -- Affectation au centre d'examen
    salle_examen VARCHAR(100),    -- Numéro de salle
    date_affectation TIMESTAMP,
    date_convocation TIMESTAMP,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (concours_id) REFERENCES concours(id) ON DELETE CASCADE
);

CREATE INDEX idx_affectation_candidat_id ON affectation_candidat(candidat_id);
CREATE INDEX idx_affectation_concours_id ON affectation_candidat(concours_id);
CREATE INDEX idx_affectation_statut ON affectation_candidat(statut_dossier);
CREATE INDEX idx_affectation_dossier_id ON affectation_candidat(dossier_id);

-- ============================================================================
-- 4. TABLE: StatutDossier (table de référence, optionnel)
-- Utile si vous voulez tracker l'historique des changements de statut
-- ============================================================================
CREATE TABLE IF NOT EXISTS historique_statut_dossier (
    id BIGSERIAL PRIMARY KEY,
    affectation_candidat_id BIGINT NOT NULL,
    ancien_statut statut_dossier,
    nouveau_statut statut_dossier NOT NULL,
    date_changement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raison TEXT,
    modified_by BIGINT,  -- ID de l'administrateur
    FOREIGN KEY (affectation_candidat_id) REFERENCES affectation_candidat(id) ON DELETE CASCADE
);

CREATE INDEX idx_historique_date ON historique_statut_dossier(date_changement);
CREATE INDEX idx_historique_affectation ON historique_statut_dossier(affectation_candidat_id);

-- ============================================================================
-- 5. TABLE: Centre Examen (référence pour les centres)
-- ============================================================================
CREATE TABLE IF NOT EXISTS centre_examen (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    adresse VARCHAR(500),
    ville VARCHAR(100),
    province VARCHAR(100),
    gouvernorat VARCHAR(100),
    code_postal VARCHAR(20),
    coordonnees_gps VARCHAR(100),  -- Format: "lat,lng"
    nombre_salles INTEGER,
    capacite_totale INTEGER,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_centre_nom ON centre_examen(nom);
CREATE INDEX idx_centre_ville ON centre_examen(ville);

-- ============================================================================
-- 6. TABLE: Spécialité/Formation (pour les concours)
-- ============================================================================
CREATE TABLE IF NOT EXISTS specialite (
    id BIGSERIAL PRIMARY KEY,
    concours_id BIGINT NOT NULL,
    code VARCHAR(50),
    libelle VARCHAR(255) NOT NULL,
    nombre_places_min INTEGER,
    nombre_places_max INTEGER,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (concours_id) REFERENCES concours(id) ON DELETE CASCADE
);

CREATE INDEX idx_specialite_concours ON specialite(concours_id);

-- ============================================================================
-- 7. TABLE: Affectation aux Spécialités
-- ============================================================================
CREATE TABLE IF NOT EXISTS affectation_specialite (
    id BIGSERIAL PRIMARY KEY,
    affectation_candidat_id BIGINT NOT NULL,
    specialite_id BIGINT NOT NULL,
    choix_ordre INTEGER,  -- 1ère choix, 2ème choix, etc.
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affectation_candidat_id) REFERENCES affectation_candidat(id) ON DELETE CASCADE,
    FOREIGN KEY (specialite_id) REFERENCES specialite(id) ON DELETE CASCADE
);

CREATE INDEX idx_affectation_spec_affectation ON affectation_specialite(affectation_candidat_id);
CREATE INDEX idx_affectation_spec_specialite ON affectation_specialite(specialite_id);
