package tn.sante.residanat_backend.Dossier_Candidature_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String QUEUE_IA_REQUEST = "q.ia.request";
    public static final String QUEUE_IA_RESPONSE = "q.ia.response";
    public static final String EXCHANGE_IA = "ia.exchange";
    public static final String ROUTING_KEY_REQUEST = "ia.request";
    public static final String ROUTING_KEY_RESPONSE = "ia.response";

    public static final String QUEUE_DOSSIER_VALIDE = "q.dossier.valide";
    public static final String EXCHANGE_DOSSIER = "dossier.exchange";
    public static final String ROUTING_KEY_VALIDE = "dossier.valide";

    public static final String QUEUE_CONVOCATION_READY = "q.convocation.ready";
    public static final String ROUTING_KEY_READY = "convocation.ready";
    public static final String ROUTING_KEY_REJETE = "dossier.rejete";

    @Bean
    public Queue requestQueue() {
        return new Queue(QUEUE_IA_REQUEST);
    }

    @Bean
    public Queue responseQueue() {
        return new Queue(QUEUE_IA_RESPONSE);
    }

    @Bean
    public TopicExchange iaExchange() {
        return new TopicExchange(EXCHANGE_IA);
    }

    @Bean
    public Binding requestBinding(Queue requestQueue, TopicExchange iaExchange) {
        return BindingBuilder.bind(requestQueue).to(iaExchange).with(ROUTING_KEY_REQUEST);
    }

    @Bean
    public Binding responseBinding(Queue responseQueue, TopicExchange iaExchange) {
        return BindingBuilder.bind(responseQueue).to(iaExchange).with(ROUTING_KEY_RESPONSE);
    }

    @Bean
    public Queue dossierValideQueue() {
        return new Queue(QUEUE_DOSSIER_VALIDE);
    }

    @Bean
    public DirectExchange dossierExchange() {
        return new DirectExchange(EXCHANGE_DOSSIER);
    }

    @Bean
    public Binding dossierValideBinding(Queue dossierValideQueue, DirectExchange dossierExchange) {
        return BindingBuilder.bind(dossierValideQueue).to(dossierExchange).with(ROUTING_KEY_VALIDE);
    }

    @Bean
    public Queue convocationReadyQueue() {
        return new Queue(QUEUE_CONVOCATION_READY);
    }

    @Bean
    public Binding convocationReadyBinding(Queue convocationReadyQueue, DirectExchange dossierExchange) {
        return BindingBuilder.bind(convocationReadyQueue).to(dossierExchange).with(ROUTING_KEY_READY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public AmqpTemplate amqpTemplate(ConnectionFactory connectionFactory) {
        @SuppressWarnings("null")
        final RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        @SuppressWarnings("null")
        MessageConverter messageConverter = jsonMessageConverter();
        @SuppressWarnings("null")
        final MessageConverter converter = messageConverter;
        @SuppressWarnings("null")
        MessageConverter converterToSet = converter;
        rabbitTemplate.setMessageConverter(converterToSet);
        return rabbitTemplate;
    }
}
