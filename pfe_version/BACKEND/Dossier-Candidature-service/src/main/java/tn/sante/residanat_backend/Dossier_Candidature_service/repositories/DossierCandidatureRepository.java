package tn.sante.residanat_backend.Dossier_Candidature_service.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.DossierCandidature;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DossierCandidatureRepository extends JpaRepository<DossierCandidature, Long> {
    // findFirst handles potential duplicate rows gracefully
    Optional<DossierCandidature> findFirstByCandidatIdAndConcoursId(Long candidatId, UUID concoursId);

    long countByStatut(tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut);

    long countByStatutAndConcoursId(tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut,
            UUID concoursId);

    long countByConcoursId(UUID concoursId);

    long countByStatutNot(tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut);

    long countByStatutNotAndConcoursId(
            tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut, UUID concoursId);

    java.util.List<DossierCandidature> findAllByStatutNot(
            tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut);

    @org.springframework.data.jpa.repository.Query("SELECT d.candidatId FROM DossierCandidature d WHERE d.concoursId = :concoursId AND d.statut <> tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier.BROUILLON")
    java.util.List<Long> findCandidatIdsByConcoursId(@org.springframework.data.repository.query.Param("concoursId") java.util.UUID concoursId);

    void deleteAllByConcoursId(java.util.UUID concoursId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT d.candidatId FROM DossierCandidature d WHERE d.statut <> tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier.BROUILLON")
    java.util.List<Long> findAllCandidatIds();

    java.util.List<DossierCandidature> findByConcoursIdAndStatut(java.util.UUID concoursId, tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier statut);
}
