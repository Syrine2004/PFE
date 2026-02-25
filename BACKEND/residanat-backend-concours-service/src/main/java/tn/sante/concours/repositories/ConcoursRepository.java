package tn.sante.concours.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.concours.models.Concours;
import tn.sante.concours.models.StatutResultat;

import java.util.UUID;

@Repository
public interface ConcoursRepository extends JpaRepository<Concours, UUID> {

    // Spring Data JPA automatically appends the `where deleted=false` global filter
    // defined securely on the entity with @Where(clause="deleted=false")

    boolean existsByLibelleAndAnnee(String libelle, Integer annee);

    Page<Concours> findByAnnee(Integer annee, Pageable pageable);

    Page<Concours> findByTypeConcoursContainingIgnoreCase(String typeConcours, Pageable pageable);

    Page<Concours> findByStatutResultat(StatutResultat statutResultat, Pageable pageable);

    Page<Concours> findByAnneeAndTypeConcoursContainingIgnoreCaseAndStatutResultat(
            Integer annee, String typeConcours, StatutResultat statutResultat, Pageable pageable);

    Page<Concours> findByAnneeAndStatutResultat(Integer annee, StatutResultat statutResultat, Pageable pageable);

    Page<Concours> findByTypeConcoursContainingIgnoreCaseAndStatutResultat(String typeConcours,
            StatutResultat statutResultat, Pageable pageable);

    Page<Concours> findByAnneeAndTypeConcoursContainingIgnoreCase(Integer annee, String typeConcours,
            Pageable pageable);
}
