package tn.sante.residanat.convocation.config;

import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration RabbitMQ pour la désérialisation JSON des événements.
 * 
 * Ce bean Jackson2JsonMessageConverter permet au DossierValideListener
 * de convertir automatiquement les messages JSON reçus de RabbitMQ
 * en objets DossierValideEvent.
 * 
 * Sans ce converter, les messages restent en JSON brut et ne peuvent pas
 * être mappés vers l'objet Java.
 */
@Configuration
public class RabbitMQConfig {

    /**
     * Fournit un convertisseur de messages qui utilise Jackson pour la sérialisation/désérialisation.
     * 
     * @return un convertisseur Jackson pour les messages AMQP
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
