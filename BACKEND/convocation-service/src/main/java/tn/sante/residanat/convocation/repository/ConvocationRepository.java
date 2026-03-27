package tn.sante.residanat.convocation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.convocation.model.Convocation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository pour la gestion des convocations
 * Étend JpaRepository pour avoir les opérations CRUD de base
 */
@Repository
public interface ConvocationRepository extends JpaRepository<Convocation, Long> {

    /**
     * Trouver une convocation par son hash sécurisé
     * Utile pour valider l'accès au PDF via le QR Code
     * 
     * @param hashSecurise le hash unique
     * @return une Optional contenant la convocation si elle existe
     */
    Optional<Convocation> findByHashSecurise(String hashSecurise);

    /**
     * Trouver une convocation par ID du dossier
     * 
     * @param dossierId l'identifiant du dossier
     * @return une Optional contenant la convocation
     */
    Optional<Convocation> findByDossierId(Long dossierId);

    /**
     * Trouver toutes les convocations d'un candidat
     * 
     * @param candidatId l'identifiant du candidat
     * @return liste des convocations du candidat
     */
    List<Convocation> findByCandidatId(Long candidatId);

    /**
     * Trouver toutes les convocations d'un concours
     * 
     * @param concoursId l'identifiant du concours (UUID en String)
     * @return liste des convocations pour ce concours
     */
    List<Convocation> findByConcoursId(String concoursId);

    /**
     * Trouver les convocations générées entre deux dates
     * 
     * @param dateDebut date de début (incluse)
     * @param dateFin date de fin (incluse)
     * @return liste des convocations générées dans cette période
     */
    @Query("SELECT c FROM Convocation c WHERE c.dateGeneration BETWEEN :dateDebut AND :dateFin " +
           "ORDER BY c.dateGeneration DESC")
    List<Convocation> findConvocationsBetweenDates(
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin
    );

    /**
     * Trouver les convocations expirées
     * 
     * @param maintenant la date/heure actuelle
     * @return liste des convocations dont la date d'expiration est passée
     */
    @Query("SELECT c FROM Convocation c WHERE c.dateExpiration IS NOT NULL AND c.dateExpiration < :maintenant " +
           "AND c.statut != 'EXPIREE'")
    List<Convocation> findExpiredConvocations(@Param("maintenant") LocalDateTime maintenant);

    /**
     * Compter les convocations générées (statut = GENEREE)
     * 
     * @return le nombre de convocations en attente de consultation
     */
    @Query("SELECT COUNT(c) FROM Convocation c WHERE c.statut = 'GENEREE'")
    long countGeneratedConvocations();

    /**
     * Compter les convocations téléchargées d'un concours
     * 
     * @param concoursId l'identifiant du concours
     * @return le nombre de convocations téléchargées
     */
    @Query("SELECT COUNT(c) FROM Convocation c WHERE c.concoursId = :concoursId " +
           "AND c.statut IN ('TELECHARGER', 'CONSULTEE')")
    long countDownloadedByConcoursId(@Param("concoursId") UUID concoursId);

    /**
     * Vérifier si une convocation existe pour un dossier donné
     * 
     * @param dossierId l'identifiant du dossier
     * @return true si une convocation existe, false sinon
     */
    boolean existsByDossierId(Long dossierId);

    /**
     * Trouver la convocation la plus récente d'un candidat
     * 
     * @param candidatId l'identifiant du candidat
     * @return une Optional contenant la convocation la plus récente
     */
    @Query("SELECT c FROM Convocation c WHERE c.candidatId = :candidatId " +
           "ORDER BY c.dateGeneration DESC LIMIT 1")
    Optional<Convocation> findLatestConvocationByCandidatId(@Param("candidatId") Long candidatId);

    /**
     * Trouver les convocations non consultées (jamais téléchargées)
     * 
     * @return liste des convocations generées mais non consultées
     */
    @Query("SELECT c FROM Convocation c WHERE c.nombreTelechargements = 0 " +
           "ORDER BY c.dateGeneration DESC")
    List<Convocation> findUnviewedConvocations();

    /**
     * Recherche avancée avec filtres
     * 
     * @param candidatId l'ID du candidat (nullable)
     * @param concoursId l'ID du concours (nullable)
     * @param statut le statut (nullable)
     * @return liste filtrée des convocations
     */
    @Query("SELECT c FROM Convocation c WHERE " +
           "(:candidatId IS NULL OR c.candidatId = :candidatId) AND " +
           "(:concoursId IS NULL OR c.concoursId = :concoursId) AND " +
           "(:statut IS NULL OR c.statut = :statut) " +
           "ORDER BY c.dateGeneration DESC")
    List<Convocation> findWithFilters(
            @Param("candidatId") Long candidatId,
            @Param("concoursId") UUID concoursId,
            @Param("statut") Convocation.StatutConvocation statut
    );
}
