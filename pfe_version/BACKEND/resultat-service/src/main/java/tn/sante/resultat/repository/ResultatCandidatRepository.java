package tn.sante.resultat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tn.sante.resultat.model.ResultatCandidat;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResultatCandidatRepository extends JpaRepository<ResultatCandidat, Long> {
    
    // Find all results for a specific concours (Paginated and List)
    List<ResultatCandidat> findByConcoursId(String concoursId);
    org.springframework.data.domain.Page<ResultatCandidat> findByConcoursId(String concoursId, org.springframework.data.domain.Pageable pageable);
    
    // Find absolute result for a specific candidate
    Optional<ResultatCandidat> findByCandidatId(Long candidatId);
    
    // Find result for a specific candidate and concours
    Optional<ResultatCandidat> findByCandidatIdAndConcoursId(Long candidatId, String concoursId);
    
    // Find by CIN
    Optional<ResultatCandidat> findByCin(String cin);

    // Find by CIN and Concours for smart update (findFirst to avoid crash if duplicates exist)
    Optional<ResultatCandidat> findFirstByCinAndConcoursId(String cin, String concoursId);

    // Find by Hash for QR code verification
    Optional<ResultatCandidat> findByHashSecurise(String hashSecurise);

    // Count results for a specific concours
    long countByConcoursId(String concoursId);

    @Transactional
    void deleteByConcoursId(String concoursId);

    // Histogram Stats
    long countByConcoursIdAndMoyenneGeneraleLessThan(String concoursId, Double score);
    long countByConcoursIdAndMoyenneGeneraleGreaterThanEqualAndMoyenneGeneraleLessThan(String concoursId, Double min, Double max);
    long countByConcoursIdAndMoyenneGeneraleGreaterThanEqual(String concoursId, Double score);
}
