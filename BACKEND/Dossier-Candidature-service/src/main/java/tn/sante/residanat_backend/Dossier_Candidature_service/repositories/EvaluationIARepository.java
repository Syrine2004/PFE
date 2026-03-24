package tn.sante.residanat_backend.Dossier_Candidature_service.repositories;

import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.EvaluationIA;
import java.util.Optional;

@Repository
public interface EvaluationIARepository extends JpaRepository<EvaluationIA, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EvaluationIA> findByDossierId(Long dossierId);
}
