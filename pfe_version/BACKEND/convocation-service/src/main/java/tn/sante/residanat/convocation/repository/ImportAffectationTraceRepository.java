package tn.sante.residanat.convocation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.convocation.model.ImportAffectationTrace;

import java.util.List;

@Repository
public interface ImportAffectationTraceRepository extends JpaRepository<ImportAffectationTrace, Long> {
    List<ImportAffectationTrace> findByConcoursIdOrderByImportedAtDesc(String concoursId);
    void deleteByConcoursId(String concoursId);
}
