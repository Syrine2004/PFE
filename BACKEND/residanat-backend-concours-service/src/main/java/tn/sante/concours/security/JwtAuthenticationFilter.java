package tn.sante.concours.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  @Value("${jwt.secret}")
  private String jwtSecret;

  @Override
  protected void doFilterInternal(
    @NonNull HttpServletRequest request,
    @NonNull HttpServletResponse response,
    @NonNull FilterChain filterChain) throws ServletException, IOException {

    final String authHeader = request.getHeader("Authorization");

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    final String token = authHeader.substring(7);

    try {
      Claims claims = Jwts.parser()
        .verifyWith(getSignInKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();

      String username = claims.getSubject();
      List<GrantedAuthority> authorities = new ArrayList<>();

      // FIX : On vérifie d'abord si le rôle est stocké sous la clé "role" (String) par le Auth-Service
      String singleRole = claims.get("role", String.class);

      if (singleRole != null) {
        // On ajoute le rôle avec le préfixe "ROLE_" si nécessaire
        authorities.add(new SimpleGrantedAuthority(
          singleRole.startsWith("ROLE_") ? singleRole : "ROLE_" + singleRole
        ));
      } else {
        // FIX (Secours) : Au cas où, on garde la vérification si c'était une liste ("roles")
        List<String> roles = claims.get("roles", List.class);
        if (roles != null) {
          authorities = roles.stream()
            .map(r -> new SimpleGrantedAuthority(r.startsWith("ROLE_") ? r : "ROLE_" + r))
            .collect(Collectors.toList());
        }
      }

      String idStr = claims.get("id") != null ? String.valueOf(claims.get("id")) : null;

      if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
          username,
          idStr,
          authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);
      }
    } catch (Exception e) {
      // Logger l'erreur (token expiré, invalide, etc.)
      logger.error("Erreur d'authentification JWT: " + e.getMessage());
    }

    filterChain.doFilter(request, response);
  }

  private SecretKey getSignInKey() {
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }
}
