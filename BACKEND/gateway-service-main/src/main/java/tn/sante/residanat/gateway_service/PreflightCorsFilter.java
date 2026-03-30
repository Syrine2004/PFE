package tn.sante.residanat.gateway_service;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class PreflightCorsFilter implements GlobalFilter, Ordered {

    private static final String FRONTEND_ORIGIN = "http://localhost:4200";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        if (HttpMethod.OPTIONS.equals(request.getMethod())) {
            String origin = request.getHeaders().getOrigin();
            if (FRONTEND_ORIGIN.equals(origin) || "http://127.0.0.1:4200".equals(origin)) {
                ServerHttpResponse response = exchange.getResponse();
                HttpHeaders headers = response.getHeaders();
                headers.add("Access-Control-Allow-Origin", origin);
                headers.add("Access-Control-Allow-Credentials", "true");
                headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
                headers.add("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With");
                headers.add("Vary", "Origin");
                headers.add("Vary", "Access-Control-Request-Method");
                headers.add("Vary", "Access-Control-Request-Headers");
                response.setStatusCode(HttpStatus.OK);
                return response.setComplete();
            }
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
