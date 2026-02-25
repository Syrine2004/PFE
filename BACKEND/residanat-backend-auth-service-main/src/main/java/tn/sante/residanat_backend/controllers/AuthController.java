package tn.sante.residanat_backend.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import tn.sante.residanat_backend.dto.AuthResponse;
import tn.sante.residanat_backend.models.Utilisateur;
import tn.sante.residanat_backend.repositories.UtilisateurRepository;
import tn.sante.residanat_backend.dto.AuthDto;
import tn.sante.residanat_backend.security.JwtUtils;

import java.time.LocalDate;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Autowired
  private UtilisateurRepository utilisateurRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private JwtUtils jwtUtils;

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody AuthDto request) {
    if (utilisateurRepository.existsByEmail(request.getEmail())) {
      return ResponseEntity.badRequest().body("Erreur : Cet email est déjà utilisé !");
    }

    if (request.getCin() != null && utilisateurRepository.existsByCin(request.getCin())) {
      return ResponseEntity.badRequest().body("Erreur : Ce numéro CIN est déjà utilisé !");
    }

    Utilisateur nouvelUtilisateur = new Utilisateur();

    // Identifiants de connexion
    nouvelUtilisateur.setEmail(request.getEmail());
    nouvelUtilisateur.setMotDePasse(passwordEncoder.encode(request.getMotDePasse()));
    nouvelUtilisateur.setRole("CANDIDAT");

    // --- TRANSFERT DES NOUVELLES INFORMATIONS DU DTO VERS L'ENTITÉ ---
    nouvelUtilisateur.setCivilite(request.getCivilite());
    nouvelUtilisateur.setNom(request.getNom());
    nouvelUtilisateur.setPrenom(request.getPrenom());
    nouvelUtilisateur.setLieuNaissance(request.getLieuNaissance());
    nouvelUtilisateur.setNationalite(request.getNationalite());
    nouvelUtilisateur.setAdresse(request.getAdresse());
    nouvelUtilisateur.setCin(request.getCin());
    nouvelUtilisateur.setTelephone(request.getTelephone());
    nouvelUtilisateur.setFaculte(request.getFaculte());

    // Conversion de la date de naissance (String -> LocalDate)
    if (request.getDateNaissance() != null && !request.getDateNaissance().isEmpty()) {
      try {
        nouvelUtilisateur.setDateNaissance(LocalDate.parse(request.getDateNaissance()));
      } catch (Exception e) {
        System.err.println("Erreur format date : " + e.getMessage());
      }
    }

    utilisateurRepository.save(nouvelUtilisateur);
    return ResponseEntity.ok("Utilisateur inscrit avec succès avec son profil complet !");
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody AuthDto request) {

    System.out.println("=====================================");
    System.out.println("🔍 TENTATIVE DE CONNEXION");
    System.out.println("Email reçu : [" + request.getEmail() + "]");
    System.out.println("=====================================");

    Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(request.getEmail());

    if (optionalUser.isEmpty()) {
      return ResponseEntity.badRequest().body("Erreur : Cet email n'existe pas.");
    }

    Utilisateur utilisateur = optionalUser.get();

    if (request.getMotDePasse() == null
        || !passwordEncoder.matches(request.getMotDePasse(), utilisateur.getMotDePasse())) {
      return ResponseEntity.badRequest().body("Erreur : Mot de passe incorrect.");
    }

    // GÉNÉRATION DU TOKEN AVEC ID
    String token = jwtUtils.generateToken(utilisateur.getEmail(), utilisateur.getRole(), utilisateur.getId());

    System.out.println("✅ RÉSULTAT : Succès ! Badge JWT généré pour : " + utilisateur.getEmail());

    return ResponseEntity.ok(new AuthResponse(token, utilisateur.getRole(), utilisateur.getId()));
  }
}
