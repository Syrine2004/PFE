package tn.sante.concours.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.concours.models.ResultatCandidat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResultatCandidatRepository extends JpaRepository<ResultatCandidat, UUID> {
    List<ResultatCandidat> findByConcoursId(UUID concoursId);
    
    @Query("SELECT r FROM ResultatCandidat r WHERE r.concoursId = :concoursId AND r.cinOrPassport = :cinOrPassport")
    Optional<ResultatCandidat> findByConcoursIdAndCinOrPassport(@Param("concoursId") UUID concoursId, @Param("cinOrPassport") String cinOrPassport);

    Optional<ResultatCandidat> findByConcoursIdAndNumeroConvocation(UUID concoursId, Long numeroConvocation);

    void deleteByConcoursId(UUID concoursId);
}
