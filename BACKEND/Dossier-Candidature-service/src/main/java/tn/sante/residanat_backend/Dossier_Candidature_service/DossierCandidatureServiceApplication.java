package tn.sante.residanat_backend.Dossier_Candidature_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class DossierCandidatureServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DossierCandidatureServiceApplication.class, args);
	}

}
