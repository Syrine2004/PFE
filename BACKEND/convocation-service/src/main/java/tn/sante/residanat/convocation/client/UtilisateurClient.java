package tn.sante.residanat.convocation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.sante.residanat.convocation.dto.UtilisateurDto;

/**
 * Client Feign pour communiquer avec le service d'authentification (utilisateurs)
 * Permet la récupération des données du candidat par ID
 */
@FeignClient(name = "auth-service")
public interface UtilisateurClient {

    /**
     * Récupère les données d'un candidat/utilisateur par son ID
     * 
     * @param id l'identifiant du candidat
     * @return les données du candidat (UtilisateurDto)
     */
    @GetMapping("/api/auth/detail/{id}")
    UtilisateurDto getUtilisateurById(@PathVariable("id") Long id);
}
