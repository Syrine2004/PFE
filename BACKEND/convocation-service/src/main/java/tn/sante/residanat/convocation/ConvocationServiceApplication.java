package tn.sante.residanat.convocation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * Classe principale du microservice Convocation.
 * 
 * Annotations clés :
 * - @SpringBootApplication : Active la configuration Spring Boot automatique
 * - @EnableDiscoveryClient : Enregistre le service auprès d'Eureka (Service Discovery)
 * - @EnableFeignClients : Active les clients Feign pour les appels inter-services
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "tn.sante.residanat.convocation.client")
public class ConvocationServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConvocationServiceApplication.class, args);
	}

}
