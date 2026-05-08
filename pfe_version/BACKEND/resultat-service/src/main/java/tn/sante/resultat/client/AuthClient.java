package tn.sante.resultat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "auth-service")
public interface AuthClient {
    
    @GetMapping("/api/auth/candidat-id")
    Long getCandidatIdByCin(@RequestParam("cin") String cin);
}
