package tn.sante.resultat.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration RabbitMQ pour la gestion des échanges et la sérialisation JSON.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "residanat-exchange";
    public static final String QUEUE_CONCOURS_DELETED = "resultat.concours.deleted.queue";
    public static final String ROUTING_KEY_CONCOURS_DELETED = "concours.deleted";
    public static final String QUEUE_AFFECTATIONS_CLEARED = "resultat.affectations.cleared.queue";
    public static final String ROUTING_KEY_AFFECTATIONS_CLEARED = "affectations.cleared";

    /**
     * Définit l'échange de type Topic pour les événements liés aux concours.
     */
    @Bean
    public TopicExchange concoursExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue concoursDeletedQueue() {
        return new Queue(QUEUE_CONCOURS_DELETED);
    }

    @Bean
    public Binding bindingConcoursDeleted(Queue concoursDeletedQueue, TopicExchange concoursExchange) {
        return BindingBuilder.bind(concoursDeletedQueue).to(concoursExchange).with(ROUTING_KEY_CONCOURS_DELETED);
    }

    @Bean
    public Queue affectationsClearedQueue() {
        return new Queue(QUEUE_AFFECTATIONS_CLEARED);
    }

    @Bean
    public Binding bindingAffectationsCleared(Queue affectationsClearedQueue, TopicExchange concoursExchange) {
        return BindingBuilder.bind(affectationsClearedQueue).to(concoursExchange).with(ROUTING_KEY_AFFECTATIONS_CLEARED);
    }

    /**
     * Configure Jackson2JsonMessageConverter pour sérialiser les événements en JSON.
     * C'est essentiel pour la communication entre microservices.
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
