package tn.sante.residanat.convocation.config;

import org.springframework.amqp.core.DirectExchange;
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

    public static final String EXCHANGE_DOSSIER = "dossier.exchange";
    public static final String ROUTING_KEY_ELIGIBILITY_FAILED = "eligibility.failed";

    public static final String EXCHANGE_CONCOURS = "residanat-exchange";
    public static final String QUEUE_CONCOURS_DELETED_CONVOC = "q.concours.deleted.convoc";
    public static final String ROUTING_KEY_CONCOURS_DELETED = "concours.deleted";

    /**
     * Définit l'échange "dossier.exchange" pour qu'il soit créé s'il n'existe pas encore.
     * 
     * @return un DirectExchange nommé dossier.exchange
     */
    @Bean
    public DirectExchange dossierExchange() {
        return new DirectExchange(EXCHANGE_DOSSIER);
    }

    @Bean
    public org.springframework.amqp.core.TopicExchange concoursExchange() {
        return new org.springframework.amqp.core.TopicExchange(EXCHANGE_CONCOURS);
    }

    @Bean
    public org.springframework.amqp.core.Queue concoursDeletedQueueConvoc() {
        return new org.springframework.amqp.core.Queue(QUEUE_CONCOURS_DELETED_CONVOC);
    }

    @Bean
    public org.springframework.amqp.core.Binding concoursDeletedBindingConvoc() {
        return org.springframework.amqp.core.BindingBuilder.bind(concoursDeletedQueueConvoc())
                .to(concoursExchange()).with(ROUTING_KEY_CONCOURS_DELETED);
    }

    /**
     * Fournit un convertisseur de messages qui utilise Jackson pour la sérialisation/désérialisation.
     * 
     * @return un convertisseur Jackson pour les messages AMQP
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            org.springframework.amqp.rabbit.connection.ConnectionFactory connectionFactory,
            MessageConverter messageConverter
    ) {
        org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory factory = new org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
