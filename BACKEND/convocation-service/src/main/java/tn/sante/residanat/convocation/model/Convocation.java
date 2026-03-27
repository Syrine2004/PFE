package tn.sante.residanat.convocation.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entité JPA pour représenter une Convocation
 * 
 * Une convocation contient:
 * - Les informations du candidat (id du dossier, candidat, concours)
 * - Un hash sécurisé unique (pour le QR Code)
 * - Le chemin du fichier PDF généré
 * - Les timestamps de création/mise à jour
 */
@Entity
@Table(name = "convocations", 
       indexes = {
           @Index(name = "idx_dossier_id", columnList = "dossier_id"),
           @Index(name = "idx_hash_securise", columnList = "hash_securise"),
           @Index(name = "idx_candidat_id", columnList = "candidat_id")
       })
public class Convocation {

    /**
     * Identifiant unique de la convocation
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID du dossier de candidature (référence au dossier-service)
     */
    @Column(name = "dossier_id", nullable = false)
    private Long dossierId;

    /**
     * ID du candidat (référence au auth-service)
     */
    @Column(name = "candidat_id", nullable = false)
    private Long candidatId;

    /**
     * ID du concours (référence au concours-service) - Stocké en tant que String UUID
     */
    @Column(name = "concours_id", nullable = false, length = 36)
    private String concoursId;

    /**
     * Hash sécurisé unique pour le QR Code
     * Généralement: SHA-256(dossierId + candidatId + timestamp + secret)
     */
    @Column(name = "hash_securise", nullable = false, unique = true, length = 256)
    private String hashSecurise;

    /**
     * Chemin du fichier PDF généré
     * Exemple: /secure/convocations/2025/03/convocation_12345.pdf
     */
    @Column(name = "chemin_fichier_pdf", nullable = false)
    private String cheminFichierPdf;

    /**
     * Statut de la convocation
     */
    @Column(name = "statut", nullable = false)
    @Enumerated(EnumType.STRING)
    private StatutConvocation statut = StatutConvocation.GENEREE;

    /**
     * Nombre de fois que la convocation a été téléchargée
     */
    @Column(name = "nombre_telechargements")
    private Integer nombreTelechargements = 0;

    /**
     * Note ou commentaire sur la convocation (optionnel)
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Timestamp de création
     */
    @CreationTimestamp
    @Column(name = "date_generation", nullable = false, updatable = false)
    private LocalDateTime dateGeneration;

    /**
     * Timestamp de dernière mise à jour
     */
    @UpdateTimestamp
    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    /**
     * Date limite de validité de la convocation
     */
    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    /**
     * Adresse IP lors de la génération (pour audit)
     */
    @Column(name = "adresse_ip")
    private String adresseIp;

    /**
     * Numéro d'inscription unique du candidat (ex: 2026-RES-0142)
     */
    @Column(name = "numero_inscription", length = 50)
    private String numeroInscription;

    /**
     * Salle d'examen (ex: Salle 1, Amphithéâtre A, etc.)
     */
    @Column(name = "salle", length = 100)
    private String salle;

    /**
     * Place assignée (ex: 142)
     */
    @Column(name = "place", length = 20)
    private String place;

    /**
     * Date de l'épreuve principale
     */
    @Column(name = "date_epreuve")
    private LocalDateTime dateEpreuve;

    /**
     * Heure d'appel (ex: 07H30)
     */
    @Column(name = "heure_appel", length = 10)
    private String heureAppel;

    /**
     * Lieu détaillé (ex: Faculté de Médecine de Tunis)
     */
    @Column(name = "lieu_examen_detail", length = 255)
    private String lieuExamenDetail;

    /**
     * User-Agent du navigateur lors de la génération (optionnel)
     */
    @Column(name = "user_agent")
    private String userAgent;

    // Constructeurs
    public Convocation() {}

    public Convocation(Long dossierId, Long candidatId, String concoursId, String hashSecurise, 
                      String cheminFichierPdf) {
        this.dossierId = dossierId;
        this.candidatId = candidatId;
        this.concoursId = concoursId;
        this.hashSecurise = hashSecurise;
        this.cheminFichierPdf = cheminFichierPdf;
        this.statut = StatutConvocation.GENEREE;
        this.nombreTelechargements = 0;
    }

    // Getters
    public Long getId() { return id; }
    public Long getDossierId() { return dossierId; }
    public Long getCandidatId() { return candidatId; }
    public String getConcoursId() { return concoursId; }
    public String getHashSecurise() { return hashSecurise; }
    public String getCheminFichierPdf() { return cheminFichierPdf; }
    public StatutConvocation getStatut() { return statut; }
    public Integer getNombreTelechargements() { return nombreTelechargements; }
    public String getNotes() { return notes; }
    public LocalDateTime getDateGeneration() { return dateGeneration; }
    public LocalDateTime getDateModification() { return dateModification; }
    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public String getAdresseIp() { return adresseIp; }
    public String getUserAgent() { return userAgent; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setDossierId(Long dossierId) { this.dossierId = dossierId; }
    public void setCandidatId(Long candidatId) { this.candidatId = candidatId; }
    public void setConcoursId(String concoursId) { this.concoursId = concoursId; }
    public void setHashSecurise(String hashSecurise) { this.hashSecurise = hashSecurise; }
    public void setCheminFichierPdf(String cheminFichierPdf) { this.cheminFichierPdf = cheminFichierPdf; }
    public void setStatut(StatutConvocation statut) { this.statut = statut; }
    public void setNombreTelechargements(Integer nombreTelechargements) { this.nombreTelechargements = nombreTelechargements; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setDateGeneration(LocalDateTime dateGeneration) { this.dateGeneration = dateGeneration; }
    public void setDateModification(LocalDateTime dateModification) { this.dateModification = dateModification; }
    public void setDateExpiration(LocalDateTime dateExpiration) { this.dateExpiration = dateExpiration; }
    public void setAdresseIp(String adresseIp) { this.adresseIp = adresseIp; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getNumeroInscription() { return numeroInscription; }
    public void setNumeroInscription(String numeroInscription) { this.numeroInscription = numeroInscription; }

    public String getSalle() { return salle; }
    public void setSalle(String salle) { this.salle = salle; }

    public String getPlace() { return place; }
    public void setPlace(String place) { this.place = place; }

    public LocalDateTime getDateEpreuve() { return dateEpreuve; }
    public void setDateEpreuve(LocalDateTime dateEpreuve) { this.dateEpreuve = dateEpreuve; }

    public String getHeureAppel() { return heureAppel; }
    public void setHeureAppel(String heureAppel) { this.heureAppel = heureAppel; }

    public String getLieuExamenDetail() { return lieuExamenDetail; }
    public void setLieuExamenDetail(String lieuExamenDetail) { this.lieuExamenDetail = lieuExamenDetail; }

    /**
     * Énumération pour les statuts de convocation
     */
    public enum StatutConvocation {
        GENEREE("Générée"),
        ENVOYEE("Envoyée"),
        TELECHARGER("Téléchargée"),
        CONSULTEE("Consultée"),
        EXPIREE("Expirée"),
        ANNULEE("Annulée");

        private final String libelle;

        StatutConvocation(String libelle) {
            this.libelle = libelle;
        }

        public String getLibelle() {
            return libelle;
        }
    }

    @PrePersist
    protected void onCreate() {
        if (dateGeneration == null) {
            dateGeneration = LocalDateTime.now();
        }
        if (statut == null) {
            statut = StatutConvocation.GENEREE;
        }
        if (nombreTelechargements == null) {
            nombreTelechargements = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }
}
