package tn.sante.residanat.convocation.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.sante.residanat.convocation.dto.DossierDto;

@FeignClient(name = "dossier-service")
public interface DossierClient {
    @GetMapping("/api/dossiers/{id}")
    DossierDto getDossierById(@PathVariable("id") Long id);
}
