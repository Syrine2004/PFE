package tn.sante.residanat_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EntityScan(basePackages = "tn.sante.residanat_backend.models")
@EnableJpaRepositories(basePackages = "tn.sante.residanat_backend.repositories")
public class ResidanatBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ResidanatBackendApplication.class, args);
	}

}
