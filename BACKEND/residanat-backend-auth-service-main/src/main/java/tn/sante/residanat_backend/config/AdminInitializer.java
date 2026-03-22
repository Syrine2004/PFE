package tn.sante.residanat_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.sante.residanat_backend.models.Utilisateur;
import tn.sante.residanat_backend.repositories.UtilisateurRepository;

import java.util.Optional;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;

@Component
public class AdminInitializer implements CommandLineRunner {

  @Autowired
  private UtilisateurRepository utilisateurRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Override
  public void run(String... args) throws Exception {
    // 1. SUPPRESSION AUTOMATIQUE DE LA CONTRAINTE UNIQUE SUR L'EMAIL
    // Hibernate 'update' ne supprime pas les anciennes contraintes, on le fait à
    // la main
    // 1. SUPPRESSION AUTOMATIQUE DE LA CONTRAINTE UNIQUE SUR L'EMAIL
    // Hibernate 'update' ne supprime pas les anciennes contraintes, on le fait à
    // la main
    /*
    try {
      jdbcTemplate.execute("ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS uk6ldvumu3hqvnmmxy1b6lsxwqy");
      System.out.println("✅ Base de données : Contrainte unique sur l'email supprimée.");
    } catch (Exception e) {
      // Si le nom de la contrainte est différent d'une machine à l'autre, on log
      // juste
      System.out.println("ℹ️ Skip : Suppression contrainte email (déjà fait ou nom différent).");
    }
    */

    String adminEmail = "admin@rns.tn";

    Optional<Utilisateur> adminExistant = utilisateurRepository.findByEmail(adminEmail);

    if (adminExistant.isEmpty()) {
      Utilisateur admin = new Utilisateur();
      admin.setEmail(adminEmail);

      // LA LIGNE CRUCIALE : On crypte obligatoirement le mot de passe !
      admin.setMotDePasse(passwordEncoder.encode("admin123"));

      admin.setCin("00000000"); // CIN par défaut pour l'admin
      admin.setRole("ADMIN");
      admin.setNom("Administrateur");
      admin.setPrenom("Système");
      admin.setFaculte("tunis");
      admin.setDateDiplome(LocalDate.of(2024, 6, 15));

      utilisateurRepository.save(admin);
      System.out.println("✅ COMPTE ADMIN CRÉÉ ET CRYPTÉ AVEC SUCCÈS !");
    } else {
      Utilisateur admin = adminExistant.get();
      if (admin.getCin() == null || admin.getCin().isEmpty()) {
        admin.setCin("00000000");
        utilisateurRepository.save(admin);
        System.out.println("ℹ️ CIN mis à jour pour le compte admin existant.");
      }
      System.out.println("ℹ️ Le compte admin existe déjà.");
    }
  }
}
