package tn.sante.residanat.listener;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import tn.sante.residanat.model.Notification;
import tn.sante.residanat.repository.NotificationRepository;
import tn.sante.residanat.dto.DossierValideEvent;
import tn.sante.residanat.dto.ConvocationReadyEvent;
import tn.sante.residanat.dto.DossierRejeteEvent;
import tn.sante.residanat.dto.EligibilityFailedEvent;

@Service
public class NotificationListener {

        private static final String MSG_DOSSIER_VALIDE = "Félicitations ! Votre dossier a été validé par l'administration.";
        private static final String MSG_CONVOCATION_READY = "Votre convocation est prête ! Vous pouvez la télécharger dans votre espace personnel.";
        private static final String MSG_DOSSIER_REJETE = "Votre dossier a été rejeté. Vous pouvez corriger vos documents et refaire l'inscription.";
        private static final String MSG_NOT_ELIGIBLE = "Désolé, votre dossier n'a pas été retenu dans la liste d'affectation du Ministère (Vérifiez votre nombre de tentatives).";

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
            exchange = @Exchange(value = "dossier.exchange"),
            key = "dossier.valide"
    ))
    public void onDossierValide(DossierValideEvent event) {
                boolean inserted = saveNotificationIfNotDuplicate(
                                event.getCandidatId(),
                                MSG_DOSSIER_VALIDE,
                                Notification.NotificationType.SUCCESS
                );

                // Trigger n8n notification (email) only once for repeated messages in short window
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "ACCEPTED", event.getDossierId());
                }
    }

    /**
     * Listen for Convocation ready
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.convocation.ready", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange"),
            key = "convocation.ready"
    ))
    public void onConvocationReady(ConvocationReadyEvent event) {
                createConvocationNotificationIfMissing(event.getCandidatId());
    }

    private void createConvocationNotificationIfMissing(Long candidatId) {
        boolean convocationNotifExists = notificationRepository
                .existsByCandidatIdAndTypeAndMessage(candidatId, Notification.NotificationType.SUCCESS, MSG_CONVOCATION_READY);

        if (!convocationNotifExists) {
            saveNotificationIfNotDuplicate(
                    candidatId,
                    MSG_CONVOCATION_READY,
                    Notification.NotificationType.SUCCESS
            );
        }
    }

    /**
     * Listen for Dossier rejection
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.dossier.rejete", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange"),
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
                                MSG_DOSSIER_REJETE,
                                Notification.NotificationType.ERROR
                );

                // Trigger n8n notification (email)
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "REJECTED", event.getDossierId());
                }
    }

    /**
     * Listen for Eligibility Failure (Ministry Whitelist)
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.notification.eligibility.failed", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange"),
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
                                MSG_NOT_ELIGIBLE,
                                Notification.NotificationType.ERROR
                );

        // Trigger n8n notification (email) with a custom status
                if (inserted) {
                        integrationService.sendN8nNotification(event.getCandidatId(), "NOT_ELIGIBLE", event.getDossierId());
                }
        }

        private boolean saveNotificationIfNotDuplicate(Long candidatId, String message, Notification.NotificationType type) {
                boolean duplicateExists = notificationRepository.existsByCandidatIdAndTypeAndMessage(
                        candidatId,
                        type,
                        message
                );

                if (duplicateExists) {
                        return false;
                }

                try {
                        notificationRepository.save(Notification.builder()
                                        .candidatId(candidatId)
                                        .message(message)
                                        .type(type)
                                        .build());
                        return true;
                } catch (DataIntegrityViolationException ignored) {
                        // Race condition safe guard if two events try to write same logical notification.
                        return false;
                }
    }
}
