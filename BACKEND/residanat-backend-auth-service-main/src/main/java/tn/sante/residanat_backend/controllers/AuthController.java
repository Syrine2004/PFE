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
    // La vérification de l'email est retirée à ta demande, seul le CIN doit être
    // unique
    /*
     * if (utilisateurRepository.existsByEmail(request.getEmail())) {
     * System.out.println("❌ TENTATIVE D'INSCRIPTION : Email déjà utilisé -> " +
     * request.getEmail());
     * return
     * ResponseEntity.badRequest().body("Erreur : Cet email est déjà utilisé !");
     * }
     */

    if (request.getCin() != null && utilisateurRepository.existsByCin(request.getCin())) {
      System.out.println("❌ TENTATIVE D'INSCRIPTION : CIN déjà utilisé -> " + request.getCin());
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
    nouvelUtilisateur.setTypeDocumentIdentite(request.getTypeDocumentIdentite() != null ? request.getTypeDocumentIdentite() : "CIN");
    nouvelUtilisateur.setTelephone(request.getTelephone());
    nouvelUtilisateur.setFaculte(request.getFaculte());

    // Conversion de la date de naissance (String -> LocalDate)
    if (request.getDateNaissance() != null && !request.getDateNaissance().isEmpty()) {
      try {
        nouvelUtilisateur.setDateNaissance(LocalDate.parse(request.getDateNaissance()));
      } catch (Exception e) {
        System.err.println("Erreur format date naissance : " + e.getMessage());
      }
    }

    // Conversion de la date de diplôme (String -> LocalDate)
    if (request.getDateDiplome() != null && !request.getDateDiplome().isEmpty()) {
      try {
        nouvelUtilisateur.setDateDiplome(LocalDate.parse(request.getDateDiplome()));
      } catch (Exception e) {
        System.err.println("Erreur format date diplome : " + e.getMessage());
      }
    }

    utilisateurRepository.save(nouvelUtilisateur);
    return ResponseEntity.ok("Utilisateur inscrit avec succès avec son profil complet !");
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody AuthDto request) {

    System.out.println("=====================================");
    System.out.println("🔍 TENTATIVE DE CONNEXION");
    System.out.println("Identifiant reçu : [" + request.getEmail() + "]");
    System.out.println("=====================================");

    // On tente de trouver l'utilisateur soit par Email, soit par CIN
    Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(request.getEmail());

    if (optionalUser.isEmpty()) {
      optionalUser = utilisateurRepository.findByCin(request.getEmail());
    }

    if (optionalUser.isEmpty()) {
      return ResponseEntity.badRequest().body("Erreur : Aucun compte trouvé avec cet Email ou CIN.");
    }

    Utilisateur utilisateur = optionalUser.get();

    if (request.getMotDePasse() == null
        || !passwordEncoder.matches(request.getMotDePasse(), utilisateur.getMotDePasse())) {
      return ResponseEntity.badRequest().body("Erreur : Mot de passe incorrect.");
    }

    // GÉNÉRATION DU TOKEN AVEC ID
    String token = jwtUtils.generateToken(utilisateur.getEmail(), utilisateur.getRole(), utilisateur.getId());

    System.out.println("✅ RÉSULTAT : Succès ! Badge JWT généré pour : " + utilisateur.getEmail());

    return ResponseEntity.ok(new AuthResponse(
        token,
        utilisateur.getRole(),
        utilisateur.getId(),
        utilisateur.getNom(),
        utilisateur.getPrenom(),
        utilisateur.getEmail()));
  }

  @GetMapping("/me")
  public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return ResponseEntity.status(401).body("Erreur : Badge manquant.");
    }

    String token = authHeader.substring(7);
    String email = jwtUtils.extractEmail(token);

    Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(email);
    if (optionalUser.isEmpty()) {
      return ResponseEntity.status(404).body("Erreur : Utilisateur non trouvé.");
    }

    Utilisateur user = optionalUser.get();
    AuthDto profile = new AuthDto();
    profile.setId(user.getId());
    profile.setEmail(user.getEmail());
    profile.setNom(user.getNom());
    profile.setPrenom(user.getPrenom());
    profile.setCivilite(user.getCivilite());
    profile.setCin(user.getCin());
    profile.setTypeDocumentIdentite(user.getTypeDocumentIdentite());
    profile.setNationalite(user.getNationalite());
    profile.setAdresse(user.getAdresse());
    profile.setTelephone(user.getTelephone());
    profile.setLieuNaissance(user.getLieuNaissance());
    profile.setFaculte(user.getFaculte());

    if (user.getDateNaissance() != null) {
      profile.setDateNaissance(user.getDateNaissance().toString());
    }
    if (user.getDateDiplome() != null) {
      profile.setDateDiplome(user.getDateDiplome().toString());
    }

    return ResponseEntity.ok(profile);
  }

  /* 
  @PutMapping("/update-profile")
  public ResponseEntity<?> updateProfile(
      @RequestHeader("Authorization") String authHeader,
      @RequestBody AuthDto request) {

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return ResponseEntity.status(401).body("Erreur : Badge manquant.");
    }

    String token = authHeader.substring(7);
    String email = jwtUtils.extractEmail(token);

    Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(email);
    if (optionalUser.isEmpty()) {
      return ResponseEntity.status(404).body("Erreur : Utilisateur non trouvé.");
    }

    Utilisateur user = optionalUser.get();

    if (request.getNom() != null)
      user.setNom(request.getNom());
    if (request.getPrenom() != null)
      user.setPrenom(request.getPrenom());
    if (request.getCin() != null)
      user.setCin(request.getCin());
    if (request.getNationalite() != null)
      user.setNationalite(request.getNationalite());
    if (request.getFaculte() != null)
      user.setFaculte(request.getFaculte());

    if (request.getDateNaissance() != null && !request.getDateNaissance().isBlank()) {
      try {
        user.setDateNaissance(LocalDate.parse(request.getDateNaissance()));
      } catch (Exception e) {
        System.err.println("Erreur format dateNaissance : " + e.getMessage());
      }
    }

    if (request.getDateDiplome() != null && !request.getDateDiplome().isBlank()) {
      try {
        user.setDateDiplome(LocalDate.parse(request.getDateDiplome()));
      } catch (Exception e) {
        System.err.println("Erreur format dateDiplome : " + e.getMessage());
      }
    }

    utilisateurRepository.save(user);
    return ResponseEntity.ok("Profil mis à jour avec succès.");
  }
  */

  @GetMapping("/users")
  public ResponseEntity<java.util.List<Utilisateur>> getAllUsers() {
    return ResponseEntity.ok(utilisateurRepository.findAll());
  }
}
