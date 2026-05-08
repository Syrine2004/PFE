package tn.sante.residanat.listener;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import tn.sante.residanat.model.Notification;
import tn.sante.residanat.repository.NotificationRepository;
import tn.sante.residanat.dto.*;

@Service
@Slf4j
public class NotificationListener {

        private static final String MSG_DOSSIER_VALIDE = "Félicitations ! Votre dossier a été validé par l'administration.";
        private static final String MSG_CONVOCATION_READY = "Votre convocation est prête ! Vous pouvez la télécharger dans votre espace personnel.";
        private static final String MSG_DOSSIER_REJETE = "Votre dossier a été rejeté. Vous pouvez corriger vos documents et refaire l'inscription.";
        private static final String MSG_NOT_ELIGIBLE = "Désolé, votre dossier n'a pas été retenu dans la liste d'affectation du Ministère (Vérifiez votre nombre de tentatives).";
        private static final String MSG_RESULTATS_PUBLIES = "Les résultats du concours ont été publiés ! Consultez votre relevé de notes dans votre espace personnel.";

    private final NotificationRepository notificationRepository;
    private final tn.sante.residanat.service.IntegrationService integrationService;

    public NotificationListener(NotificationRepository notificationRepository, tn.sante.residanat.service.IntegrationService integrationService) {
        this.notificationRepository = notificationRepository;
        this.integrationService = integrationService;
    }

    /**
     * Listen for Dossier logic (Validation)
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.dossier.valide", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange", type = "direct"),
            key = "dossier.valide"
    ))
    public void onDossierValide(DossierValideEvent event) {
                // Supprimer les notifications d'inéligibilité précédentes pour éviter les contradictions
                notificationRepository.deleteByCandidatIdAndTypeAndMessage(
                        event.getCandidatId(),
                        Notification.NotificationType.ERROR,
                        MSG_NOT_ELIGIBLE
                );

                boolean inserted = saveNotificationIfNotDuplicate(
                                event.getCandidatId(),
                                event.getConcoursId(),
                                MSG_DOSSIER_VALIDE,
                                Notification.NotificationType.SUCCESS
                );

                // Trigger n8n notification (email) only once for repeated messages in short window
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "ACCEPTED", event.getDossierId(), MSG_DOSSIER_VALIDE);
                }
    }

    /**
     * Listen for Convocation ready
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.convocation.ready", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange", type = "direct"),
            key = "convocation.ready"
    ))
    public void onConvocationReady(ConvocationReadyEvent event) {
                // Nettoyage proactif
                notificationRepository.deleteByCandidatIdAndTypeAndMessage(
                        event.getCandidatId(),
                        Notification.NotificationType.ERROR,
                        MSG_NOT_ELIGIBLE
                );
                createConvocationNotificationIfMissing(event.getCandidatId(), event.getConcoursId());
                integrationService.sendN8nNotification(event.getCandidatId(), "CONVOCATION_READY", null, MSG_CONVOCATION_READY);
    }

    private void createConvocationNotificationIfMissing(Long candidatId, String concoursId) {
        saveNotificationIfNotDuplicate(
                candidatId,
                concoursId,
                MSG_CONVOCATION_READY,
                Notification.NotificationType.SUCCESS
        );
    }

    /**
     * Listen for Dossier rejection
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.dossier.rejete", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange", type = "direct"),
            key = "dossier.rejete"
    ))
    public void onDossierRejete(DossierRejeteEvent event) {
                // Avoid contradictory timeline: rejected candidate should not keep "convocation ready" message.
                notificationRepository.deleteByCandidatIdAndTypeAndMessage(
                        event.getCandidatId(),
                        Notification.NotificationType.SUCCESS,
                        MSG_CONVOCATION_READY
                );

                boolean inserted = saveNotificationIfNotDuplicate(
                                event.getCandidatId(),
                                event.getConcoursId(),
                                MSG_DOSSIER_REJETE,
                                Notification.NotificationType.ERROR
                );

                // Trigger n8n notification (email)
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "REJECTED", event.getDossierId(), MSG_DOSSIER_REJETE);
                }
    }

    /**
     * Listen for Eligibility Failure (Ministry Whitelist)
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.eligibility.failed", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange", type = "direct"),
            key = "eligibility.failed"
    ))
    public void onEligibilityFailed(EligibilityFailedEvent event) {
                // Avoid contradictory timeline: non-eligible candidate should not keep "convocation ready" message.
                notificationRepository.deleteByCandidatIdAndTypeAndMessage(
                        event.getCandidatId(),
                        Notification.NotificationType.SUCCESS,
                        MSG_CONVOCATION_READY
                );

                boolean inserted = saveNotificationIfNotDuplicate(
                                event.getCandidatId(),
                                event.getConcoursId(),
                                MSG_NOT_ELIGIBLE,
                                Notification.NotificationType.ERROR
                );

        // Trigger n8n notification (email) with a custom status
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "NOT_ELIGIBLE", event.getDossierId(), MSG_NOT_ELIGIBLE);
                }
        }

    private boolean saveNotificationIfNotDuplicate(Long candidatId, String concoursId, String message, Notification.NotificationType type) {
        if (notificationRepository.existsByCandidatIdAndConcoursIdAndTypeAndMessage(candidatId, concoursId, type, message)) {
            return false;
        }
        try {
            notificationRepository.save(Notification.builder()
                    .candidatId(candidatId)
                    .concoursId(concoursId)
                    .message(message)
                    .type(type)
                    .build());
            return true;
        } catch (Exception e) {
            log.error("Error saving notification", e);
            return false;
        }
    }

    private void saveNotification(Long candidatId, String concoursId, String message, Notification.NotificationType type) {
        try {
            notificationRepository.save(Notification.builder()
                    .candidatId(candidatId)
                    .concoursId(concoursId)
                    .message(message)
                    .type(type)
                    .build());
        } catch (Exception e) {
            log.error("Error saving notification", e);
        }
    }

    /**
     * Listen for Results Publication (Results Available)
     * Creates a generic notification as fallback
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.resultats.publies", durable = "true"),
            exchange = @Exchange(value = "concours.exchange", type = "topic"),
            key = "concours.resultats.publies"
    ))
    public void onResultatsPublies(ResultatsPubliesEvent event) {
        log.info("Generic results publication event received for concours: {}", event.getConcoursId());
        
        // This is generic, we don't have a candidatId here. 
        // In a real scenario, we would trigger a job to notify everyone.
    }

    /**
     * Listen for Individual Candidate Results
     * Using Map<String, Object> to avoid package mismatch issues with __TypeId__
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.resultat.candidat.publie", durable = "true"),
            exchange = @Exchange(value = "concours.exchange", type = "topic"),
            key = "concours.resultats.candidat.publie"
    ))
    public void onResultatCandidatPublie(java.util.Map<String, Object> payload) {
        try {
            Long candidatId = ((Number) payload.get("candidatId")).longValue();
            String concoursId = (String) payload.get("concoursId");
            String statut = (String) payload.get("statut");
            if (statut == null) statut = "Publié";
            
            String message = "Les résultats sont publiés. Statut : " + statut + ". Cliquez pour consulter votre relevé.";
            
            Notification.NotificationType type = Notification.NotificationType.SUCCESS;
            if (statut.toLowerCase().contains("ajourn") || statut.toLowerCase().contains("refus")) {
                type = Notification.NotificationType.ERROR;
            }

            saveNotificationIfNotDuplicate(candidatId, concoursId, message, type);
            integrationService.sendN8nNotification(candidatId, "RESULTATS_PUBLIES", null, message);
            log.info("Notification created for candidate {}", candidatId);
        } catch (Exception e) {
            log.error("Error processing individual result notification", e);
        }
    }

    /**
     * Listen for Reclamation closure
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "reclamation.cloturee.queue", durable = "true"),
            exchange = @Exchange(value = "reclamation.exchange", type = "direct"),
            key = "reclamation.cloturee"
    ))
    public void onReclamationCloturee(ReclamationClotureeEvent event) {
        String message = "Votre réclamation concernant '" + event.getObjet() + "' a été traitée.";
        Notification.NotificationType type = "CLOTUREE_ACCEPTEE".equals(event.getStatut()) 
            ? Notification.NotificationType.SUCCESS 
            : Notification.NotificationType.ERROR;

        if (type == Notification.NotificationType.SUCCESS) {
            message += "L'administration a validé votre demande.";
        } else {
            message += "Malheureusement, votre demande n'a pas pu être acceptée.";
        }

        saveNotification(
                event.getCandidatId(),
                event.getConcoursId(),
                message,
                type
        );

        // Mapping statut for n8n email templates
        String n8nStatus = "CLOTUREE_ACCEPTEE".equals(event.getStatut()) ? "RECLAMATION_ACCEPTED" : "RECLAMATION_REJECTED";
        integrationService.sendN8nNotification(event.getCandidatId(), n8nStatus, event.getReclamationId(), message);
    }

    /**
     * Listen for Reclamation submission
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.reclamation.creee", durable = "true"),
            exchange = @Exchange(value = "reclamation.exchange"),
            key = "reclamation.creee"
    ))
    public void onReclamationCreee(ReclamationCreeeEvent event) {
        String message = "Votre réclamation concernant '" + event.getObjet() + "' a été bien reçue par l'administration.";
        
        saveNotification(
                event.getCandidatId(),
                event.getConcoursId(),
                message,
                Notification.NotificationType.SUCCESS
        );
        
        // n8n notification for submission if needed
        integrationService.sendN8nNotification(event.getCandidatId(), "RECLAMATION_SUBMITTED", event.getReclamationId(), message);
    }
}
