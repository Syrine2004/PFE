package tn.sante.residanat.listener;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.stereotype.Service;
import tn.sante.residanat.model.Notification;
import tn.sante.residanat.repository.NotificationRepository;
import tn.sante.residanat.dto.DossierValideEvent;
import tn.sante.residanat.dto.ConvocationReadyEvent;
import tn.sante.residanat.dto.DossierRejeteEvent;

@Service
public class NotificationListener {

    private final NotificationRepository notificationRepository;

    public NotificationListener(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
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
        notificationRepository.save(Notification.builder()
                .candidatId(event.getCandidatId())
                .message("Félicitations ! Votre dossier a été validé par l'administration.")
                .type(Notification.NotificationType.SUCCESS)
                .build());

                createConvocationNotificationIfMissing(event.getCandidatId());
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
                                .existsByCandidatIdAndMessageContainingIgnoreCase(candidatId, "convocation");

                if (!convocationNotifExists) {
                        notificationRepository.save(Notification.builder()
                                        .candidatId(candidatId)
                                        .message("Votre convocation est prête ! Vous pouvez la télécharger dans votre espace personnel.")
                                        .type(Notification.NotificationType.SUCCESS)
                                        .build());
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
        notificationRepository.save(Notification.builder()
                .candidatId(event.getCandidatId())
                .message("Votre dossier a été rejeté. Vous pouvez corriger vos documents et refaire l'inscription.")
                .type(Notification.NotificationType.ERROR)
                .build());
    }
}
