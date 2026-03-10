package tn.sante.concours.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.concours.models.Concours;
import tn.sante.concours.models.Etat;

import java.util.UUID;

@Repository
public interface ConcoursRepository extends JpaRepository<Concours, UUID> {

        // Spring Data JPA automatically appends the `where deleted=false` global filter
        // defined securely on the entity with @Where(clause="deleted=false")

        boolean existsByLibelleAndAnnee(String libelle, Integer annee);

        Page<Concours> findByAnnee(Integer annee, Pageable pageable);

        Page<Concours> findByTypeConcoursContainingIgnoreCase(String typeConcours, Pageable pageable);

        Page<Concours> findByEtat(Etat etat, Pageable pageable);

        Page<Concours> findByAnneeAndTypeConcoursContainingIgnoreCaseAndEtat(
                        Integer annee, String typeConcours, Etat etat, Pageable pageable);

        Page<Concours> findByAnneeAndEtat(Integer annee, Etat etat, Pageable pageable);

        Page<Concours> findByTypeConcoursContainingIgnoreCaseAndEtat(String typeConcours,
                        Etat etat, Pageable pageable);

        Page<Concours> findByAnneeAndTypeConcoursContainingIgnoreCase(Integer annee, String typeConcours,
                        Pageable pageable);
}
