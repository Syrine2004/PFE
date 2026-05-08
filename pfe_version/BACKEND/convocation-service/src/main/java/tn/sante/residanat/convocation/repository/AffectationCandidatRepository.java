package tn.sante.residanat.convocation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.convocation.model.AffectationCandidat;

import java.util.List;
import java.util.Optional;

@Repository
public interface AffectationCandidatRepository extends JpaRepository<AffectationCandidat, Long> {
    @Query("SELECT a.fac, COUNT(a) FROM AffectationCandidat a WHERE (:concoursId IS NULL OR a.concoursId = :concoursId) GROUP BY a.fac")
    List<Object[]> countByFaculte(@Param("concoursId") String concoursId);

    Optional<AffectationCandidat> findByCin(String cin);
    Optional<AffectationCandidat> findByCinAndConcoursId(String cin, String concoursId);
    org.springframework.data.domain.Page<AffectationCandidat> findByConcoursId(String concoursId, org.springframework.data.domain.Pageable pageable);
    long countByConcoursId(String concoursId);
    boolean existsByConcoursIdAndPublie(String concoursId, boolean publie);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from AffectationCandidat a where a.concoursId = :concoursId")
    void deleteByConcoursId(@Param("concoursId") String concoursId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update AffectationCandidat a set a.publie = :status where a.concoursId = :concoursId")
    void updatePublieByConcoursId(@Param("concoursId") String concoursId, @Param("status") boolean status);
}
