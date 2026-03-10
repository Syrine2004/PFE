package tn.sante.residanat.ia.messaging;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import tn.sante.residanat.ia.config.RabbitMQConfig;
import tn.sante.residanat.ia.services.ValidationDocumentaireIAService;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class IARequestListener {

    private final ValidationDocumentaireIAService iaService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "q.ia.request")
    public void handleIARequest(Map<String, Object> request) {
        System.out.println("RECEIVED IA REQUEST via RabbitMQ: " + request);

        // On récupère le dossierId pour pouvoir renvoyer la réponse au bon endroit
        Long dossierId = ((Number) request.get("dossierId")).longValue();

        // Analyse
        Map<String, Object> result = iaService.analyserDocument(request);

        // On rajoute l'ID du dossier dans la réponse
        result.put("dossierId", dossierId);

        // Envoi de la réponse
        System.out.println("IA Response sent to RabbitMQ (" + result.get("type") + ") for dossier " + dossierId);
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_IA, RabbitMQConfig.ROUTING_KEY_RESPONSE, result);
    }
}
