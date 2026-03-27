package tn.sante.residanat.convocation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.sante.residanat.convocation.dto.ConcoursDto;

import java.util.UUID;

/**
 * Client Feign pour communiquer avec le service de gestion des concours
 * Permet la récupération des détails d'un concours par ID
 */
@FeignClient(name = "concours-service")
public interface ConcoursClient {

    /**
     * Récupère les détails d'un concours par son ID
     * 
     * @param id l'identifiant du concours
     * @return les données du concours (ConcoursDto)
     */
    @GetMapping("/api/concours/{id}")
    ConcoursDto getConcoursById(@PathVariable("id") UUID id);
}
