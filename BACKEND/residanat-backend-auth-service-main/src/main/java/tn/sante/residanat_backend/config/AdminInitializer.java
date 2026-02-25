package tn.sante.residanat_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.sante.residanat_backend.models.Utilisateur;
import tn.sante.residanat_backend.repositories.UtilisateurRepository;

import java.util.Optional;

@Component
public class AdminInitializer implements CommandLineRunner {

  @Autowired
  private UtilisateurRepository utilisateurRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Override
  public void run(String... args) throws Exception {
    String adminEmail = "admin@rns.tn";

    Optional<Utilisateur> adminExistant = utilisateurRepository.findByEmail(adminEmail);

    if (adminExistant.isEmpty()) {
      Utilisateur admin = new Utilisateur();
      admin.setEmail(adminEmail);

      // LA LIGNE CRUCIALE : On crypte obligatoirement le mot de passe !
      admin.setMotDePasse(passwordEncoder.encode("admin123"));

      admin.setRole("ADMIN");

      utilisateurRepository.save(admin);
      System.out.println("✅ COMPTE ADMIN CRÉÉ ET CRYPTÉ AVEC SUCCÈS !");
    } else {
      System.out.println("ℹ️ Le compte admin existe déjà.");
    }
  }
}
