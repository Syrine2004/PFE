package tn.sante.reclamation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.reclamation.entity.Categorie;
import tn.sante.reclamation.entity.Priorite;
import tn.sante.reclamation.entity.Reclamation;
import tn.sante.reclamation.entity.Statut;

import java.util.List;

@Repository
public interface ReclamationRepository extends JpaRepository<Reclamation, Long> {

    List<Reclamation> findByStatut(Statut statut);

    List<Reclamation> findByPrioriteOrderByDateSoumissionAsc(Priorite priorite);

    @Query("SELECT r FROM Reclamation r WHERE " +
           "(:statut IS NULL OR r.statut = :statut) AND " +
           "(:priorite IS NULL OR r.priorite = :priorite) AND " +
           "(:categorie IS NULL OR r.categorie = :categorie) AND " +
           "(:concoursId IS NULL OR :concoursId = '' OR r.concoursId = :concoursId) " +
           "ORDER BY r.dateSoumission DESC")
    List<Reclamation> findWithFilters(
            @Param("statut") Statut statut,
            @Param("priorite") Priorite priorite,
            @Param("categorie") Categorie categorie,
            @Param("concoursId") String concoursId);

    List<Reclamation> findByCandidatIdAndConcoursIdOrderByDateSoumissionDesc(Long candidatId, String concoursId);
    List<Reclamation> findByCandidatIdAndConcoursIdIsNullOrderByDateSoumissionDesc(Long candidatId);
    List<Reclamation> findByCandidatIdOrderByDateSoumissionDesc(Long candidatId);
    long countByStatut(Statut statut);
    long countByCategorie(Categorie categorie);

    @Query("SELECT COUNT(r) FROM Reclamation r WHERE r.priorite = :priorite AND (:concoursId IS NULL OR :concoursId = '' OR r.concoursId = :concoursId)")
    long countByPriorite(@Param("priorite") Priorite priorite, @Param("concoursId") String concoursId);

    @Query("SELECT COUNT(r) FROM Reclamation r WHERE r.priorite = :priorite AND r.statut IN :statuts AND (:concoursId IS NULL OR :concoursId = '' OR r.concoursId = :concoursId)")
    long countByPrioriteAndStatutIn(@Param("priorite") Priorite priorite, @Param("statuts") List<Statut> statuts, @Param("concoursId") String concoursId);

    @Query("SELECT COUNT(r) FROM Reclamation r WHERE r.categorie = :categorie AND r.statut IN :statuts AND (:concoursId IS NULL OR :concoursId = '' OR r.concoursId = :concoursId)")
    long countByCategorieAndStatutIn(@Param("categorie") Categorie categorie, @Param("statuts") List<Statut> statuts, @Param("concoursId") String concoursId);

    @Query("SELECT COUNT(r) FROM Reclamation r WHERE r.categorie = :categorie AND r.priorite = :priorite AND (:concoursId IS NULL OR :concoursId = '' OR r.concoursId = :concoursId)")
    long countByCategorieAndPriorite(@Param("categorie") Categorie categorie, @Param("priorite") Priorite priorite, @Param("concoursId") String concoursId);
}
