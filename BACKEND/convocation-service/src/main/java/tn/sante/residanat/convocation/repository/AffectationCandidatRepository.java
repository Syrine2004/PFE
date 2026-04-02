package tn.sante.residanat.convocation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.convocation.model.AffectationCandidat;

import java.util.Optional;

@Repository
public interface AffectationCandidatRepository extends JpaRepository<AffectationCandidat, Long> {
    Optional<AffectationCandidat> findByCin(String cin);
    Optional<AffectationCandidat> findByCinAndConcoursId(String cin, String concoursId);
    long countByConcoursId(String concoursId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from AffectationCandidat a where a.concoursId = :concoursId")
    void deleteByConcoursId(@Param("concoursId") String concoursId);
}
