package tn.sante.residanat.ia.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_IA = "ia.exchange";
    public static final String ROUTING_KEY_RESPONSE = "ia.response";
    public static final String QUEUE_IA_REQUEST = "q.ia.request";
    public static final String QUEUE_IA_RESPONSE = "q.ia.response";

    @Bean
    public Queue requestQueue() {
        return new Queue(QUEUE_IA_REQUEST, true, false, false);
    }

    @Bean
    public Queue responseQueue() {
        return new Queue(QUEUE_IA_RESPONSE, true, false, false);
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
