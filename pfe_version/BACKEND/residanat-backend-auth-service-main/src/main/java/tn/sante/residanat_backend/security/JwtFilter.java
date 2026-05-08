package tn.sante.residanat_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtFilter extends OncePerRequestFilter {

  private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);

  @Autowired
  private JwtUtils jwtUtils;

  @Override
  protected void doFilterInternal(
      @org.springframework.lang.NonNull HttpServletRequest request,
      @org.springframework.lang.NonNull HttpServletResponse response,
      @org.springframework.lang.NonNull FilterChain filterChain)
    throws ServletException, IOException {

    // 1. On récupère le badge dans l'entête "Authorization"
    String authHeader = request.getHeader("Authorization");

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7); // On enlève le mot "Bearer "

      try {
        String email = jwtUtils.extractEmail(token);
        String role = jwtUtils.extractRole(token);
        
        logger.debug("🔐 Validation du token pour : {}", email);

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
          // 2. Si le badge est valide, on informe Spring Security que l'utilisateur est autorisé
          UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            email,
            null,
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
          );
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (Exception e) {
        logger.error("❌ Badge invalide ou expiré : {}", e.getMessage());
      }
    }

    // 3. On laisse la requête continuer son chemin
    filterChain.doFilter(request, response);
  }
}
