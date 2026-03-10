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
}
