package tn.sante.residanat_backend.Dossier_Candidature_service.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import tn.sante.residanat_backend.Dossier_Candidature_service.config.RabbitMQConfig;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.*;
import tn.sante.residanat_backend.Dossier_Candidature_service.repositories.DocumentRepository;
import tn.sante.residanat_backend.Dossier_Candidature_service.repositories.DossierCandidatureRepository;
import tn.sante.residanat_backend.Dossier_Candidature_service.repositories.EvaluationIARepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DossierCandidatureService {

    private final DossierCandidatureRepository dossierRepository;
    private final DocumentRepository documentRepository;
    private final EvaluationIARepository evaluationRepository;
    private final FileStorageService fileStorageService;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public DossierCandidature createOrGetDossier(Long candidatId, UUID concoursId) {
        return dossierRepository.findFirstByCandidatIdAndConcoursId(candidatId, concoursId)
                .orElseGet(() -> {
                    DossierCandidature dossier = DossierCandidature.builder()
                            .candidatId(candidatId)
                            .concoursId(concoursId)
                            .statut(StatutDossier.EN_ATTENTE)
                            .build();
                    return dossierRepository.save(dossier);
                });
    }

    @Transactional
    public Document uploadDocument(Long dossierId, MultipartFile file, TypeDocument type) {
        DossierCandidature dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> new RuntimeException("Dossier introuvable"));

        // Check if a document of the same type already exists for this dossier
        documentRepository.findByDossierIdAndType(dossierId, type).ifPresent(existingDoc -> {
            dossier.getDocuments().remove(existingDoc);
            documentRepository.delete(existingDoc);
        });

        String subDir = "dossier_" + dossierId;
        String filePath = fileStorageService.storeFile(file, subDir);

        Document document = Document.builder()
                .nom(file.getOriginalFilename())
                .type(type)
                .cheminFichier(filePath)
                .dossier(dossier)
                .build();

        Document savedDoc = documentRepository.save(document);

        // Déclenchement automatique de l'IA pour CIN, PASSEPORT, ou DIPLOME
        if (type == TypeDocument.CIN || type == TypeDocument.PASSEPORT || type == TypeDocument.DIPLOME) {
            // L'appel déclenchera l'analyse pour les documents disponibles
            triggerIAAnalysis(dossierId);
        }

        return savedDoc;
    }

    @Transactional
    public void triggerIAAnalysis(Long dossierId) {
        triggerIAAnalysis(dossierId, new java.util.HashMap<>());
    }

    @Transactional
    public void triggerIAAnalysis(Long dossierId, java.util.Map<String, Object> candidateData) {
        if (candidateData == null || candidateData.isEmpty() || !candidateData.containsKey("cin")) {
            System.out.println("Skipping IA Analysis for dossier " + dossierId
                    + " because no candidate data (CIN/Nom) was provided. Manual re-analysis required.");
            return;
        }

        DossierCandidature dossier = getDossierById(dossierId);

        // On cherche les documents à analyser
        Document identiteDoc = dossier.getDocuments().stream()
                .filter(doc -> doc.getType() == TypeDocument.CIN || doc.getType() == TypeDocument.PASSEPORT)
                .findFirst()
                .orElse(null);

        Document diplomeDoc = dossier.getDocuments().stream()
                .filter(doc -> doc.getType() == TypeDocument.DIPLOME)
                .findFirst()
                .orElse(null);

        if (identiteDoc == null && diplomeDoc == null) {
            System.err.println("Aucun document analysable (Identité ou Diplôme) trouvé pour le dossier " + dossierId);
            return;
        }

        try {
            // Envoi pour l'identité
            if (identiteDoc != null) {
                java.nio.file.Path absolutePathId = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(identiteDoc.getCheminFichier());

                java.util.Map<String, Object> iaRequestId = new java.util.HashMap<>(candidateData);
                iaRequestId.put("dossierId", dossierId);
                iaRequestId.put("imagePath", absolutePathId.toString());
                iaRequestId.put("type", identiteDoc.getType().toString());

                System.out.println("SENDING IA REQUEST (Identité) via RabbitMQ for dossier " + dossierId);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_REQUEST,
                        iaRequestId);
            }

            // Envoi pour le diplôme
            if (diplomeDoc != null) {
                java.nio.file.Path absolutePathDiplome = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(diplomeDoc.getCheminFichier());

                java.util.Map<String, Object> iaRequestDiplome = new java.util.HashMap<>(candidateData);
                iaRequestDiplome.put("dossierId", dossierId);
                iaRequestDiplome.put("imagePath", absolutePathDiplome.toString());
                iaRequestDiplome.put("type", diplomeDoc.getType().toString());

                System.out.println("SENDING IA REQUEST (Diplôme) via RabbitMQ for dossier " + dossierId);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_REQUEST,
                        iaRequestDiplome);
            }

        } catch (Exception e) {
            System.err.println("Erreur envoi RabbitMQ IA: " + e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_IA_RESPONSE)
    @Transactional
    public void handleIAResponse(java.util.Map<String, Object> iaResponse) {
        System.out.println("RECEIVED IA RESPONSE via RabbitMQ: " + iaResponse);
        Long dossierId = ((Number) iaResponse.get("dossierId")).longValue();

        DossierCandidature dossier = dossierRepository.findById(dossierId).orElse(null);
        if (dossier != null) {
            EvaluationIA evaluation = evaluationRepository.findByDossierId(dossierId)
                    .orElse(EvaluationIA.builder().dossier(dossier).build());

            Object scoreObj = iaResponse.get("score");
            Double newScore = (scoreObj instanceof Number) ? ((Number) scoreObj).doubleValue() : 80.0;
            String type = (String) iaResponse.get("type");

            // Met à jour le score spécifique
            if ("DIPLOME".equalsIgnoreCase(type)) {
                evaluation.setScoreDiplome(newScore);
            } else {
                // Par défaut, c'est l'identité (CIN/PASSEPORT)
                evaluation.setScoreCin(newScore);
            }

            // Calcul du score global
            Double scoreGlobal = null;
            if (evaluation.getScoreCin() != null && evaluation.getScoreDiplome() != null) {
                scoreGlobal = (evaluation.getScoreCin() + evaluation.getScoreDiplome()) / 2.0;
            } else if (evaluation.getScoreCin() != null) {
                scoreGlobal = evaluation.getScoreCin();
            } else if (evaluation.getScoreDiplome() != null) {
                scoreGlobal = evaluation.getScoreDiplome();
            }
            evaluation.setScore(scoreGlobal);

            // Combinaison des anomalies
            String newAnomaliesStr = (String) iaResponse.get("anomalies");
            if (newAnomaliesStr != null && !newAnomaliesStr.isBlank()
                    && !newAnomaliesStr.equals("Aucune anomalie détectée.")) {
                String prefix = "DIPLOME".equalsIgnoreCase(type) ? "[DIPLOME]: " : "[IDENTITE]: ";
                String currentAnomalies = evaluation.getAnomalies() != null ? evaluation.getAnomalies() : "";

                // On traite les anomalies ligne par ligne pour rajouter le préfixe
                StringBuilder combined = new StringBuilder(currentAnomalies);
                for (String line : newAnomaliesStr.split("\n")) {
                    String cleanLine = line.trim();
                    if (!cleanLine.isEmpty() && !currentAnomalies.contains(cleanLine)) {
                        if (combined.length() > 0)
                            combined.append("\n");
                        combined.append(prefix).append(cleanLine);
                    }
                }
                evaluation.setAnomalies(combined.toString());
            }

            // Un dossier est vérifié uniquement si l'appel actuel le dit (à affiner selon
            // les règles métier)
            if (Boolean.TRUE.equals(iaResponse.get("verified"))) {
                evaluation.setVerifie(true);
            }

            EvaluationIA savedEval = evaluationRepository.save(evaluation);

            dossier.setEvaluationIA(savedEval);
            dossierRepository.save(dossier);
            System.out.println(
                    "Dossier " + dossierId + " updated with IA results (" + type + "). Global score: " + scoreGlobal);
        }
    }

    public List<DossierCandidature> getAllDossiers() {
        return dossierRepository.findAll();
    }

    public DossierCandidature getDossierById(Long id) {
        return dossierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dossier introuvable"));
    }

    public java.util.Optional<DossierCandidature> getDossierByCandidat(Long candidatId, UUID concoursId) {
        return dossierRepository.findFirstByCandidatIdAndConcoursId(candidatId, concoursId);
    }

    @Transactional
    public DossierCandidature updateStatut(Long id, StatutDossier statut) {
        DossierCandidature dossier = getDossierById(id);
        dossier.setStatut(statut);
        return dossierRepository.save(dossier);
    }

    @Transactional
    public DossierCandidature updateDateDiplome(Long id, String dateDiplome) {
        DossierCandidature dossier = getDossierById(id);
        dossier.setDateDiplome(dateDiplome);
        return dossierRepository.save(dossier);
    }
}
