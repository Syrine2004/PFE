package tn.sante.residanat_backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

  // 1. Le mot de passe secret de ton application (il doit être long !)
  private final String SECRET = "CeciEstUneCleSecreteTresLonguePourResidanatTN2026!";

  // 2. La durée de vie du Token (ici 24 heures en millisecondes)
  private final long EXPIRATION_TIME = 86400000;

  // Fonction interne pour transformer ton secret en vraie clé cryptographique
  private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
  }

  // --------------------------------------------------------
  // ACTION 1 : Fabriquer le badge (Générer le Token)
  // --------------------------------------------------------
  public String generateToken(String email, String role, Long id) {
    return Jwts.builder()
        .subject(email) // Le propriétaire du badge
        .claim("role", role) // On écrit son rôle dessus
        .claim("id", id) // Ajout de l'ID utilisateur
        .issuedAt(new Date()) // Date de création
        .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME)) // Date de fin
        .signWith(getSigningKey()) // On signe le badge avec notre clé secrète
        .compact();
  }

  // --------------------------------------------------------
  // ACTION 2 : Lire le nom sur le badge (Extraire l'email)
  // --------------------------------------------------------
  public String extractEmail(String token) {
    return getClaims(token).getSubject();
  }

  // --------------------------------------------------------
  // ACTION 3 : Lire le rôle sur le badge
  // --------------------------------------------------------
  public String extractRole(String token) {
    return getClaims(token).get("role", String.class);
  }

  // --------------------------------------------------------
  // ACTION 4 : Vérifier si le badge est valide pour cette personne
  // --------------------------------------------------------
  public boolean isTokenValid(String token, String email) {
    final String extractedEmail = extractEmail(token);
    return (extractedEmail.equals(email) && !isTokenExpired(token));
  }

  // Vérifier si la date est dépassée
  private boolean isTokenExpired(String token) {
    return getClaims(token).getExpiration().before(new Date());
  }

  // Ouvrir le badge de manière sécurisée
  private Claims getClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
