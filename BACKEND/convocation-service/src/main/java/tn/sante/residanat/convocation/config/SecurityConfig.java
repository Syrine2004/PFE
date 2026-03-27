package tn.sante.residanat.convocation.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuration de sécurité pour le Convocation Service.
 * 
 * Autorise l'accès public à :
 * - /api/convocations/test-generation/** (endpoint de TEST pour valider la génération PDF)
 * - Les endpoints Swagger/Actuator
 * 
 * Tous les autres endpoints restent sécurisés (authentification requise).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authz -> authz
                        // 🔓 ENDPOINTS DE LECTURE - Accès PUBLIC (pour TESTS uniquement - à restreindre en PRODUCTION)
                        .requestMatchers("/api/convocations/info/**").permitAll()
                        .requestMatchers("/api/convocations/telecharger/**").permitAll()
                        // 🔓 ENDPOINT DE TEST - Accès PUBLIC (à désactiver en PRODUCTION)
                        .requestMatchers("/api/convocations/test-generation/**").permitAll()
                        // 🔓 Documentation & santé
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        // 🔒 Tous les autres endpoints sécurisés
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
    }
}
