package tn.sante.residanat_backend.Dossier_Candidature_service.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.Document;

import tn.sante.residanat_backend.Dossier_Candidature_service.models.TypeDocument;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    Optional<Document> findByDossierIdAndType(Long dossierId, TypeDocument type);
}
