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
import tn.sante.residanat_backend.Dossier_Candidature_service.event.DossierValideEvent;
import tn.sante.residanat_backend.Dossier_Candidature_service.event.DossierRejeteEvent;
import tn.sante.residanat_backend.Dossier_Candidature_service.event.ConvocationReadyEvent;

import java.time.LocalDateTime;
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
                    @SuppressWarnings("null")
                    final DossierCandidature dossierToSave2 = dossier;
                    @SuppressWarnings("null")
                    DossierCandidature savedDossier = dossierToSave2;
                    return dossierRepository.save(savedDossier);
                });
    }

    @Transactional
    public Document uploadDocument(Long dossierId, MultipartFile file, TypeDocument type) {
        @SuppressWarnings("null")
        DossierCandidature dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> new RuntimeException("Dossier introuvable"));

        // Check if a document of the same type already exists for this dossier
        documentRepository.findByDossierIdAndType(dossierId, type).ifPresent(existingDoc -> {
            dossier.getDocuments().remove(existingDoc);
            @SuppressWarnings("null")
            final Document docToDelete2 = existingDoc;
            @SuppressWarnings("null")
            Document docDelete = docToDelete2;
            documentRepository.delete(docDelete);
        });

        String subDir = "dossier_" + dossierId;
        String filePath = fileStorageService.storeFile(file, subDir);

        Document document = Document.builder()
                .nom(file.getOriginalFilename())
                .type(type)
                .cheminFichier(filePath)
                .dossier(dossier)
                .build();

        @SuppressWarnings("null")
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

        Document photoIdentiteDoc = dossier.getDocuments().stream()
                .filter(doc -> doc.getType() == TypeDocument.PHOTO_IDENTITE)
                .findFirst()
                .orElse(null);

        if (identiteDoc == null && diplomeDoc == null) {
            System.err.println("Aucun document analysable (Identité ou Diplôme) trouvé pour le dossier " + dossierId);
            return;
        }

        EvaluationIA evaluation = evaluationRepository.findByDossierId(dossierId)
                .orElse(EvaluationIA.builder().dossier(dossier).build());

        String batchId = UUID.randomUUID().toString();
        evaluation.setAnalysisBatchId(batchId);
        evaluation.setAnalysisStatus("RUNNING");
        evaluation.setExpectedChecks(0);
        evaluation.setCompletedChecks(0);
        evaluation.setScore(null);
        evaluation.setScoreCin(null);
        evaluation.setScoreDiplome(null);
        evaluation.setScorePhoto(null);
        evaluation.setAnomalies(null);
        evaluation.setVerifie(true);
        evaluation.setDateEvaluation(LocalDateTime.now());

        EvaluationIA savedEval = evaluationRepository.save(evaluation);
        dossier.setEvaluationIA(savedEval);
        dossierRepository.save(dossier);

        int sentCount = 0;

        try {
            String photoIdentitePath = null;
            if (photoIdentiteDoc != null) {
                photoIdentitePath = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(photoIdentiteDoc.getCheminFichier()).toString();
            }

            // Envoi pour l'identité
            if (identiteDoc != null) {
                java.nio.file.Path absolutePathId = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(identiteDoc.getCheminFichier());

                java.util.Map<String, Object> iaRequestId = new java.util.HashMap<>(candidateData);
                iaRequestId.put("dossierId", dossierId);
                iaRequestId.put("batchId", batchId);
                iaRequestId.put("imagePath", absolutePathId.toString());
                iaRequestId.put("type", identiteDoc.getType().toString());
                if (photoIdentitePath != null) {
                    iaRequestId.put("photoIdentitePath", photoIdentitePath);
                }

                System.out.println("SENDING IA REQUEST (Identité) via RabbitMQ for dossier " + dossierId);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_REQUEST,
                        iaRequestId);
                sentCount++;
            }

            // Envoi pour le diplôme
            if (diplomeDoc != null) {
                java.nio.file.Path absolutePathDiplome = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(diplomeDoc.getCheminFichier());

                java.util.Map<String, Object> iaRequestDiplome = new java.util.HashMap<>(candidateData);
                iaRequestDiplome.put("dossierId", dossierId);
                iaRequestDiplome.put("batchId", batchId);
                iaRequestDiplome.put("imagePath", absolutePathDiplome.toString());
                iaRequestDiplome.put("type", diplomeDoc.getType().toString());
                if (photoIdentitePath != null) {
                    iaRequestDiplome.put("photoIdentitePath", photoIdentitePath);
                }

                System.out.println("SENDING IA REQUEST (Diplôme) via RabbitMQ for dossier " + dossierId);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_REQUEST,
                        iaRequestDiplome);
                sentCount++;
            }

            // Envoi pour la Photo d'Identité seule (Vérification "Visage")
            if (photoIdentiteDoc != null) {
                java.nio.file.Path absolutePathPhoto = java.nio.file.Paths.get("uploads/dossiers").toAbsolutePath()
                        .resolve(photoIdentiteDoc.getCheminFichier());

                java.util.Map<String, Object> iaRequestPhoto = new java.util.HashMap<>(candidateData);
                iaRequestPhoto.put("dossierId", dossierId);
                iaRequestPhoto.put("batchId", batchId);
                iaRequestPhoto.put("imagePath", absolutePathPhoto.toString());
                iaRequestPhoto.put("type", photoIdentiteDoc.getType().toString());

                System.out.println("SENDING IA REQUEST (Photo) via RabbitMQ for dossier " + dossierId);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_REQUEST,
                        iaRequestPhoto);
                sentCount++;
            }

            evaluation.setExpectedChecks(sentCount);
            evaluation.setAnalysisStatus(sentCount > 0 ? "RUNNING" : "FAILED");
            evaluation.setDateEvaluation(LocalDateTime.now());
            evaluationRepository.save(evaluation);
        } catch (Exception e) {
            System.err.println("Erreur envoi RabbitMQ IA: " + e.getMessage());
            evaluation.setAnalysisStatus("FAILED");
            evaluation.setAnomalies("Erreur envoi RabbitMQ IA: " + e.getMessage());
            evaluation.setDateEvaluation(LocalDateTime.now());
            evaluationRepository.save(evaluation);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_IA_RESPONSE)
    @Transactional
    public void handleIAResponse(java.util.Map<String, Object> iaResponse) {
        System.out.println("RECEIVED IA RESPONSE via RabbitMQ: " + iaResponse);
        Long dossierId = ((Number) iaResponse.get("dossierId")).longValue();
        String responseBatchId = (String) iaResponse.get("batchId");

        if (responseBatchId == null || responseBatchId.isBlank()) {
            System.err.println("Ignoring IA response without batchId for dossier " + dossierId);
            return;
        }

        DossierCandidature dossier = dossierRepository.findById(dossierId).orElse(null);
        if (dossier != null) {
            EvaluationIA evaluation = evaluationRepository.findByDossierId(dossierId)
                    .orElse(EvaluationIA.builder().dossier(dossier).build());

            if (evaluation.getAnalysisBatchId() == null || !responseBatchId.equals(evaluation.getAnalysisBatchId())) {
                System.out.println("Ignoring stale IA response for dossier " + dossierId + " and batch " + responseBatchId);
                return;
            }

            Object scoreObj = iaResponse.get("score");
            Double newScore = (scoreObj instanceof Number) ? ((Number) scoreObj).doubleValue() : null;
            String type = (String) iaResponse.get("type");

            if (newScore == null) {
                System.err.println("IA response without numeric score for dossier " + dossierId + " and type " + type + ".");
                return;
            }

            Integer completedChecks = evaluation.getCompletedChecks() != null ? evaluation.getCompletedChecks() : 0;
            boolean isNewTypeResult = false;

            // Met à jour le score spécifique
            if ("DIPLOME".equalsIgnoreCase(type)) {
                isNewTypeResult = evaluation.getScoreDiplome() == null;
                evaluation.setScoreDiplome(newScore);
            } else if ("PHOTO_IDENTITE".equalsIgnoreCase(type)) {
                isNewTypeResult = evaluation.getScorePhoto() == null;
                evaluation.setScorePhoto(newScore);
            } else {
                // Par défaut, c'est l'identité (CIN/PASSEPORT)
                isNewTypeResult = evaluation.getScoreCin() == null;
                evaluation.setScoreCin(newScore);
            }

            if (isNewTypeResult) {
                completedChecks = completedChecks + 1;
                evaluation.setCompletedChecks(completedChecks);
            }

            Integer expectedChecks = evaluation.getExpectedChecks() != null ? evaluation.getExpectedChecks() : 0;

            // Gestion des anomalies : Remplacement par type ("Fresh Reporting")
            String newAnomaliesStr = (String) iaResponse.get("anomalies");
            String prefix;
            if ("DIPLOME".equalsIgnoreCase(type)) {
                prefix = "[DIPLOME]: ";
            } else if ("PHOTO_IDENTITE".equalsIgnoreCase(type)) {
                prefix = "[PHOTO]: ";
            } else {
                prefix = "[IDENTITE]: ";
            }

            String currentAnomalies = evaluation.getAnomalies() != null ? evaluation.getAnomalies() : "";
            
            // On filtre les anciennes anomalies avec le même préfixe pour repartir sur du "neuf" pour ce type
            java.util.List<String> anomalyLines = new java.util.ArrayList<>();
            if (!currentAnomalies.isBlank()) {
                for (String line : currentAnomalies.split("\n")) {
                    if (!line.trim().startsWith(prefix)) {
                        anomalyLines.add(line.trim());
                    }
                }
            }

            // Ajout des nouvelles anomalies si présentes
            if (newAnomaliesStr != null && !newAnomaliesStr.isBlank() && !newAnomaliesStr.equals("Aucune anomalie détectée.")) {
                for (String line : newAnomaliesStr.split("\n")) {
                    String cleanLine = line.trim();
                    if (!cleanLine.isEmpty()) {
                        anomalyLines.add(prefix + cleanLine);
                    }
                }
            }
            
            evaluation.setAnomalies(String.join("\n", anomalyLines));
            evaluation.setDateEvaluation(LocalDateTime.now());

            boolean currentVerified = Boolean.TRUE.equals(iaResponse.get("verified"));
            evaluation.setVerifie(evaluation.isVerifie() && currentVerified);

            if (expectedChecks > 0 && completedChecks >= expectedChecks) {
                long count = 0;
                double sum = 0;
                if (evaluation.getScoreCin() != null) { sum += evaluation.getScoreCin(); count++; }
                if (evaluation.getScoreDiplome() != null) { sum += evaluation.getScoreDiplome(); count++; }
                if (evaluation.getScorePhoto() != null) { sum += evaluation.getScorePhoto(); count++; }

                evaluation.setScore(count > 0 ? sum / count : null);
                evaluation.setAnalysisStatus("DONE");
            } else {
                evaluation.setScore(null);
                evaluation.setAnalysisStatus("RUNNING");
            }

            EvaluationIA savedEval = evaluationRepository.save(evaluation);

            dossier.setEvaluationIA(savedEval);
            dossierRepository.save(dossier);
            System.out.println(
                    "Dossier " + dossierId + " updated with IA results (" + type + "). Global score: " + evaluation.getScore());
        }
    }

    public List<DossierCandidature> getAllDossiers() {
        return dossierRepository.findAll();
    }

    public DossierCandidature getDossierById(Long id) {
        @SuppressWarnings("null")
        DossierCandidature result = dossierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dossier introuvable"));
        return result;
    }

    public java.util.Optional<DossierCandidature> getDossierByCandidat(Long candidatId, UUID concoursId) {
        return dossierRepository.findFirstByCandidatIdAndConcoursId(candidatId, concoursId);
    }

    @Transactional
    public DossierCandidature updateStatut(Long id, StatutDossier statut) {
        DossierCandidature dossier = getDossierById(id);
        dossier.setStatut(statut);
        DossierCandidature savedDossier = dossierRepository.save(dossier);

        // Si le dossier est validé, on envoie l'événement pour la convocation
        if (statut == StatutDossier.VALIDE) {
            DossierValideEvent event = new DossierValideEvent(
                savedDossier.getId(),
                savedDossier.getCandidatId(),
                savedDossier.getConcoursId()
            );
            System.out.println("Publishing DossierValideEvent for dossier " + id);
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_DOSSIER,
                RabbitMQConfig.ROUTING_KEY_VALIDE,
                event
            );
        } else if (statut == StatutDossier.REJETE) {
            // Publish Rejection Event for Notification Service
            DossierRejeteEvent event = new DossierRejeteEvent(
                savedDossier.getId(),
                savedDossier.getCandidatId(),
                "Dossier rejeté par l'administration"
            );
            System.out.println("Publishing DossierRejeteEvent for dossier " + id);
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_DOSSIER,
                RabbitMQConfig.ROUTING_KEY_REJETE,
                event
            );
        }

        return savedDossier;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_CONVOCATION_READY)
    @Transactional
    public void handleConvocationReady(ConvocationReadyEvent event) {
        System.out.println("RECEIVED ConvocationReadyEvent: " + event + " - Handled by standalone Notification Service");
    }

    @Transactional
    public DossierCandidature updateDateDiplome(Long id, String dateDiplome) {
        DossierCandidature dossier = getDossierById(id);
        dossier.setDateDiplome(dateDiplome);
        return dossierRepository.save(dossier);
    }
}
