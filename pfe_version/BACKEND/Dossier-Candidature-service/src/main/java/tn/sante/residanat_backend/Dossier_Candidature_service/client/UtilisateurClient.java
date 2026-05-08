package tn.sante.residanat_backend.Dossier_Candidature_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

/**
 * Client Feign pour communiquer avec le service d'authentification
 * Permet la récupération et la mise à jour des données du candidat
 */
@FeignClient(name = "auth-service")
public interface UtilisateurClient {

    /**
     * Récupère les données d'un utilisateur par son ID
     */
    @GetMapping("/api/auth/detail/{id}")
    Map<String, Object> getUtilisateurById(@PathVariable("id") Long id);

    /**
     * Met à jour les données personnelles d'un utilisateur
     */
    @PutMapping("/api/auth/utilisateurs/{id}")
    void updateUtilisateur(
        @PathVariable("id") Long id,
        @RequestBody Map<String, Object> data
    );
}
