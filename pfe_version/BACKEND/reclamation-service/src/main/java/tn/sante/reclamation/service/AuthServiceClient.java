package tn.sante.reclamation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.sante.reclamation.dto.CandidatDetailDTO;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceClient {

    private final RestTemplate restTemplate;

    @Value("${auth.service.url:http://auth-service:8081}")
    private String authServiceUrl;

    public CandidatDetailDTO getCandidateDetails(Long id) {
        try {
            String url = authServiceUrl + "/api/auth/detail/" + id;
            return restTemplate.getForObject(url, CandidatDetailDTO.class);
        } catch (Exception e) {
            log.error("Failed to fetch candidate details for ID {}: {}", id, e.getMessage());
            // Return a fallback or empty DTO to avoid crashing the whole list
            return CandidatDetailDTO.builder()
                    .id(id)
                    .nom("Utilisateur")
                    .prenom("Inconnu")
                    .cin("N/A")
                    .build();
        }
    }
}
