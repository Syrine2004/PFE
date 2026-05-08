package tn.sante.resultat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.resultat.model.ImportResultatTrace;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportResultatTraceRepository extends JpaRepository<ImportResultatTrace, Long> {
    List<ImportResultatTrace> findByConcoursIdOrderByImportedAtDesc(String concoursId);
    Optional<ImportResultatTrace> findFirstByConcoursIdOrderByImportedAtDesc(String concoursId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByConcoursId(String concoursId);
}
