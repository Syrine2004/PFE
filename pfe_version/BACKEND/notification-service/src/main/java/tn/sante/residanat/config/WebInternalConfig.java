package tn.sante.residanat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class WebInternalConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
