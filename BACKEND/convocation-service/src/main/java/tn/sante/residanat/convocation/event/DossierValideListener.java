package tn.sante.residanat.convocation.event;

import com.google.zxing.WriterException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.stereotype.Component;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import tn.sante.residanat.convocation.service.ConvocationService;

import java.io.IOException;

/**
 * Listener RabbitMQ pour l'événement "dossier.valide.event".
 * Déclenche la génération de convocation dès qu'un dossier est validé.
 * Architecture asynchrone : découplage du dossier-service et du convocation-service.
 */
@Component
public class DossierValideListener {

    private static final Logger log = LoggerFactory.getLogger(DossierValideListener.class);
    private final ConvocationService convocationService;
    private final RabbitTemplate rabbitTemplate;

    public DossierValideListener(ConvocationService convocationService, RabbitTemplate rabbitTemplate) {
        this.convocationService = convocationService;
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Traite l'événement DossierValideEvent reçu de la queue RabbitMQ.
     * Déclenche la génération de convocation avec tous les IDs nécessaires.
     * En cas d'erreur, log l'exception sans bloquer la file d'attente.
     * 
     * @param event l'événement contenant dossierId, candidatId, concoursId
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "q.dossier.valide", durable = "true"),
            exchange = @Exchange(value = "dossier.exchange"),
            key = "dossier.valide"
    ))
    public void traiterDossierValide(DossierValideEvent event) {
        try {
            log.info("📨 Événement reçu : dossier {} validé pour le candidat {} / concours {}",
                    event.getDossierId(), event.getCandidatId(), event.getConcoursId());

            // Déclenche le pipeline complet de génération de convocation
            var convocation = convocationService.genererConvocation(
                    event.getDossierId(),
                    event.getCandidatId(),
                    event.getConcoursId()
            );

            log.info("✅ Convocation générée avec succès : id={}, hash={}, path={}",
                    convocation.getId(), convocation.getHashSecurise(), convocation.getCheminFichierPdf());

            // Notification du candidat via le dossier-service
            ConvocationReadyEvent readyEvent = new ConvocationReadyEvent(
                event.getDossierId(),
                event.getCandidatId(),
                convocation.getHashSecurise()
            );
            
            log.info("📤 Envoi de l'événement ConvocationReadyEvent pour le candidat {}", event.getCandidatId());
            rabbitTemplate.convertAndSend("dossier.exchange", "convocation.ready", readyEvent);

        } catch (WriterException e) {
            // Erreur lors de la génération du QR Code
            log.error("❌ Erreur ZXing : impossible de générer le QR Code. DossierId={}",
                    event.getDossierId(), e);

        } catch (IOException e) {
            // Erreur lors de la génération/sauvegarde du PDF ou du fichier
            log.error("❌ Erreur I/O : impossible de créer/sauvegarder le PDF. DossierId={}",
                    event.getDossierId(), e);

        } catch (Exception e) {
            // Erreur générique (Feign, sauvegarde en BD, etc.)
            String errorType = e.getClass().getSimpleName();
            log.error("❌ Erreur {} : impossible de traiter la convocation. DossierId={}",
                    errorType, event.getDossierId(), e);
        }
        // La méthode se termine sans relancer l'exception : la file RabbitMQ ne sera pas bloquée
    }
}
