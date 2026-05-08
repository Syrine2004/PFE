-- ============================================================================
-- Sprint 2 - Dossier Service Database Schema
-- Base de données: residanat_dossier_db (postgres-dossier)
-- ============================================================================

-- ============================================================================
-- 1. ENUM: Type Document
-- ============================================================================
CREATE TYPE type_document AS ENUM (
    'DIPLOME',
    'CERTIFICAT_STUDIES',
    'CIN',
    'PASSPORT',
    'PHOTO_IDENTITE',
    'RELEVÉ_NOTES',
    'LETTRE_RECOMMANDATION',
    'ATTESTATION_TRAVAIL',
    'AUTRE'
);

-- ============================================================================
-- 2. ENUM: Statut Document
-- ============================================================================
CREATE TYPE statut_document AS ENUM (
    'EN_ATTENTE',
    'VALIDE',
    'REJETE',
    'EN_REVISION'
);

-- ============================================================================
-- 3. TABLE: DossierCandidature (amélioré depuis Sprint 1)
-- Représente un dossier d'inscription d'un candidat pour un concours
-- ============================================================================
CREATE TABLE IF NOT EXISTS dossier_candidature (
    id BIGSERIAL PRIMARY KEY,
    
    -- Références croisées (identifiants transientes)
    candidat_id BIGINT NOT NULL,         -- ID depuis auth-service
    concours_id BIGINT NOT NULL,         -- ID depuis concours-service
    affectation_candidat_id BIGINT,      -- ID depuis concours-service (Sprint 2)
    
    -- Métadonnées du dossier
    numero_dossier VARCHAR(50) UNIQUE NOT NULL,
    statut VARCHAR(50) DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'REJETE', 'COMPLET')),
    date_soumission TIMESTAMP NOT NULL,
    date_derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_complete TIMESTAMP,  -- Date quand tous les documents ont été uploadés
    
    -- Informations académiques
    date_diplome DATE,
    discipline_formation VARCHAR(255),
    universite_diplome VARCHAR(255),
    pays_diplome VARCHAR(100),
    
    -- Informations additionnelles (Sprint 2)
    adresse_residence VARCHAR(500),
    ville_residence VARCHAR(100),
    code_postal_residence VARCHAR(20),
    gouvernorat_residence VARCHAR(100),
    telephone_contact VARCHAR(20),
    email_contact VARCHAR(255),
    
    -- Informations professionnelles
    statut_emploi VARCHAR(50),  -- ETUDIANT, SANS_EMPLOI, EMPLOYE, ENTREPRENEUR
    entreprise VARCHAR(255),
    poste VARCHAR(100),
    secteur_emploi VARCHAR(100),
    annees_experience INTEGER,
    
    -- Score IA et vérification (liés au service IA)
    score_ia_global DECIMAL(5,2),
    statut_verification_ia VARCHAR(50) DEFAULT 'EN_ATTENTE',
    date_verification_ia TIMESTAMP,
    
    -- Commentaires et observations
    observations_admin TEXT,
    raison_rejet TEXT,
    raison_incompletude TEXT,
    
    -- Traçabilité
    created_by BIGINT,  -- ID administrateur qui a créé/importé
    modified_by BIGINT, -- ID administrateur qui a modifié
    
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dossier_candidat ON dossier_candidature(candidat_id);
CREATE INDEX idx_dossier_concours ON dossier_candidature(concours_id);
CREATE INDEX idx_dossier_numero ON dossier_candidature(numero_dossier);
CREATE INDEX idx_dossier_statut ON dossier_candidature(statut);
CREATE INDEX idx_dossier_affectation ON dossier_candidature(affectation_candidat_id);
CREATE INDEX idx_dossier_date_soumission ON dossier_candidature(date_soumission);

-- ============================================================================
-- 4. TABLE: Document (amélioré depuis Sprint 1)
-- Gère les documents uploadés pour chaque dossier
-- ============================================================================
CREATE TABLE IF NOT EXISTS document (
    id BIGSERIAL PRIMARY KEY,
    dossier_id BIGINT NOT NULL,
    nom VARCHAR(255) NOT NULL,
    type_document type_document NOT NULL,
    description VARCHAR(500),
    statut_document statut_document DEFAULT 'EN_ATTENTE',
    
    -- Stockage fichier
    chemin_fichier VARCHAR(500) NOT NULL,
    nom_fichier_original VARCHAR(255),
    extension_fichier VARCHAR(10),
    taille_fichier BIGINT,  -- en bytes
    hash_fichier VARCHAR(255),  -- SHA256 pour intégrité
    url_acces VARCHAR(500),
    
    -- Validation
    date_upload TIMESTAMP NOT NULL,
    date_validation TIMESTAMP,
    validated_by BIGINT,  -- ID administrateur
    commentaires_validation TEXT,
    
    -- Métadonnées
    format_valide BOOLEAN DEFAULT TRUE,
    lisibilite_suffisante BOOLEAN DEFAULT TRUE,
    
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_suppression TIMESTAMP,
    
    FOREIGN KEY (dossier_id) REFERENCES dossier_candidature(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_dossier ON document(dossier_id);
CREATE INDEX idx_document_type ON document(type_document);
CREATE INDEX idx_document_statut ON document(statut_document);
CREATE INDEX idx_document_date_upload ON document(date_upload);

-- ============================================================================
-- 5. TABLE: EvaluationIA (améliorée depuis Sprint 1)
-- Résultats de l'analyse IA des documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_ia (
    id BIGSERIAL PRIMARY KEY,
    dossier_id BIGINT NOT NULL,
    
    -- Scores globaux
    score DECIMAL(5,2),           -- Score global 0-100
    score_cin DECIMAL(5,2),       -- Score CIN 0-100
    score_diplome DECIMAL(5,2),   -- Score diplôme 0-100
    score_photo DECIMAL(5,2),     -- Score photo 0-100
    
    -- Anomalies détectées
    anomalies TEXT,               -- Description des anomalies
    liste_anomalies TEXT[],       -- Array des anomalies individuelles
    
    -- Confiance et vérification
    niveau_confiance VARCHAR(50),  -- HAUTE, MOYENNE, BASSE
    statut_verification BOOLEAN DEFAULT FALSE,
    verifie BOOLEAN DEFAULT FALSE,
    
    -- Dates
    date_evaluation TIMESTAMP NOT NULL,
    date_verification TIMESTAMP,
    
    -- Modèle IA utilisé
    version_model VARCHAR(50),     -- Ex: v1.0, v2.1
    temps_traitement INTEGER,      -- en ms
    
    -- Analyse détaillée
    analyse_cin TEXT,             -- Détails analyse CIN
    analyse_diplome TEXT,         -- Détails analyse diplôme
    analyse_photo TEXT,           -- Détails analyse photo
    
    -- Recommandations
    recommendation VARCHAR(100),  -- APPROUVER, APPROUVER_AVEC_RESERVE, REJETER
    motif_recommendation TEXT,
    
    -- Metadata
    analyseur_id BIGINT,           -- ID du service IA
    analysed_by VARCHAR(100),      -- Quel modèle/script a analysé
    
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossier_candidature(id) ON DELETE CASCADE
);

CREATE INDEX idx_eval_ia_dossier ON evaluation_ia(dossier_id);
CREATE INDEX idx_eval_ia_score ON evaluation_ia(score);
CREATE INDEX idx_eval_ia_date ON evaluation_ia(date_evaluation);
CREATE INDEX idx_eval_ia_verifie ON evaluation_ia(verifie);

-- ============================================================================
-- 6. TABLE: Historique Statut Dossier
-- Trace l'évolution du statut du dossier
-- ============================================================================
CREATE TABLE IF NOT EXISTS historique_statut_dossier (
    id BIGSERIAL PRIMARY KEY,
    dossier_id BIGINT NOT NULL,
    ancien_statut VARCHAR(50),
    nouveau_statut VARCHAR(50) NOT NULL,
    date_changement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raison_changement TEXT,
    changed_by BIGINT,  -- ID administrateur
    commentaire TEXT,
    FOREIGN KEY (dossier_id) REFERENCES dossier_candidature(id) ON DELETE CASCADE
);

CREATE INDEX idx_hist_dossier_date ON historique_statut_dossier(date_changement);
CREATE INDEX idx_hist_dossier_dossier_id ON historique_statut_dossier(dossier_id);

-- ============================================================================
-- 7. TABLE: Révision Document
-- Historique des révisions pour évaluation partielle
-- ============================================================================
CREATE TABLE IF NOT EXISTS revision_document (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    numero_revision INTEGER DEFAULT 1,
    chemin_fichier_revision VARCHAR(500),
    nom_fichier VARCHAR(255),
    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raison_revision TEXT,
    requested_by BIGINT,  -- ID administrateur qui a demandé
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE
);

CREATE INDEX idx_revision_document ON revision_document(document_id);

-- ============================================================================
-- 8. TABLE: Tâche d'Analyse (pour queue de traitement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tache_analyse_ia (
    id BIGSERIAL PRIMARY KEY,
    dossier_id BIGINT NOT NULL,
    document_id BIGINT,
    type_analyse VARCHAR(100),  -- GLOBAL, CIN_ONLY, DIPLOME_ONLY, PHOTO_ONLY
    statut VARCHAR(50) DEFAULT 'EN_ATTENTE',  -- EN_ATTENTE, EN_COURS, TERMINEE, ECHEC
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_debut_traitement TIMESTAMP,
    date_fin_traitement TIMESTAMP,
    tentatives INTEGER DEFAULT 0,
    dernier_message_erreur TEXT,
    resultat_evaluation_id BIGINT,
    FOREIGN KEY (dossier_id) REFERENCES dossier_candidature(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE SET NULL,
    FOREIGN KEY (resultat_evaluation_id) REFERENCES evaluation_ia(id) ON DELETE SET NULL
);

CREATE INDEX idx_tache_dossier ON tache_analyse_ia(dossier_id);
CREATE INDEX idx_tache_statut ON tache_analyse_ia(statut);
CREATE INDEX idx_tache_date ON tache_analyse_ia(date_creation);

-- ============================================================================
-- 9. TABLE: Validation Manuelle (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS validation_manuelle (
    id BIGSERIAL PRIMARY KEY,
    dossier_id BIGINT NOT NULL,
    document_id BIGINT,
    administrateur_id BIGINT NOT NULL,  -- ID administrateur validant
    decision VARCHAR(50),  -- APPROUVER, APPROUVER_AVEC_RESERVE, REJETER
    commentaire TEXT,
    date_validation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossier_candidature(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE SET NULL
);

CREATE INDEX idx_validation_dossier ON validation_manuelle(dossier_id);
CREATE INDEX idx_validation_admin ON validation_manuelle(administrateur_id);
CREATE INDEX idx_validation_date ON validation_manuelle(date_validation);
