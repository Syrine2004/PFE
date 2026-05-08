package tn.sante.residanat.convocation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.sante.residanat.convocation.dto.DossierDto;

@FeignClient(name = "dossier-service")
public interface DossierClient {
    @GetMapping("/api/dossiers/{id}")
    DossierDto getDossierById(@PathVariable("id") Long id);

    @GetMapping("/api/dossiers/candidat-ids")
    java.util.List<Long> getCandidatIds(@org.springframework.web.bind.annotation.RequestParam(value = "concoursId", required = false) java.util.UUID concoursId);

    @GetMapping("/api/dossiers/validated")
    java.util.List<java.util.Map<String, Object>> getValidatedDossiers(@org.springframework.web.bind.annotation.RequestParam("concoursId") java.util.UUID concoursId);
}
