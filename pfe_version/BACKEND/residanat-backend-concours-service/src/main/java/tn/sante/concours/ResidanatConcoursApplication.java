package tn.sante.concours;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing(auditorAwareRef = "auditorAware")
@SpringBootApplication
public class ResidanatConcoursApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResidanatConcoursApplication.class, args);
    }

}
