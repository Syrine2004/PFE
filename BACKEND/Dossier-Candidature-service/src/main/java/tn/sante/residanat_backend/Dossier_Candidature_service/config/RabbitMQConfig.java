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
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public AmqpTemplate amqpTemplate(ConnectionFactory connectionFactory) {
        final RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        return rabbitTemplate;
    }
}
