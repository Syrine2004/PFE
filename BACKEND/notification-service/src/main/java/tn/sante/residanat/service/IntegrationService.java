package tn.sante.residanat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class IntegrationService {

    private final RestTemplate restTemplate;

    @Value("${app.auth-service-url}")
    private String authServiceUrl;

    @Value("${app.n8n-webhook-url}")
    private String n8nWebhookUrl;

    /**
     * Send notification data to n8n after fetching extra details from auth-service
     */
    public void sendN8nNotification(Long candidatId, String status, Long dossierId) {
        try {
            log.info("Fetching candidate details for ID: {} from auth-service", candidatId);
            
            // 1. Fetch user details from auth-service
            String url = authServiceUrl + "/api/auth/detail/" + candidatId;
            @SuppressWarnings("unchecked")
            Map<String, Object> userDetails = restTemplate.getForObject(url, Map.class);

            if (userDetails == null) {
                log.warn("Could not fetch user details for candidate ID: {}", candidatId);
                return;
            }

            // 2. Prepare payload for n8n
            Map<String, Object> payload = new HashMap<>();
            payload.put("candidatId", candidatId);
            payload.put("email", userDetails.get("email"));
            payload.put("nom", userDetails.get("nom"));
            payload.put("prenom", userDetails.get("prenom"));
            payload.put("status", status); // ACCEPTED or REJECTED
            payload.put("dossierId", dossierId);
            payload.put("timestamp", System.currentTimeMillis());

            log.info("Sending payload to n8n webhook: {}", payload);

            // 3. Post to n8n Webhook
            restTemplate.postForEntity(n8nWebhookUrl, payload, String.class);
            log.info("Successfully notified n8n for dossier {}", dossierId);

        } catch (Exception e) {
            log.error("Failed to send n8n notification for candidat {}: {}", candidatId, e.getMessage());
        }
    }

}
