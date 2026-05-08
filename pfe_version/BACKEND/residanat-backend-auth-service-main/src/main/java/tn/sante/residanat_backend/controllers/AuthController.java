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
import tn.sante.residanat_backend.dto.ForgotPasswordDto;
import tn.sante.residanat_backend.dto.ChangePasswordDto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.Map;
import java.util.HashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Autowired
  private UtilisateurRepository utilisateurRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private JwtUtils jwtUtils;

  @Value("${N8N_WEBHOOK_URL:http://n8n:5678/webhook/password-reset}")
  private String n8nWebhookUrl;

  @Autowired
  private RestTemplate restTemplate;

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

    try {
      utilisateurRepository.save(nouvelUtilisateur);
      return ResponseEntity.ok("Utilisateur inscrit avec succès avec son profil complet !");
    } catch (org.springframework.dao.DataIntegrityViolationException e) {
      System.err.println("❌ ERREUR DB (DataIntegrityViolation) : " + e.getMessage());
      return ResponseEntity.badRequest().body("Erreur : Un compte avec cet email existe déjà en base de données, ou une contrainte (CIN/Email) a été violée.");
    } catch (Exception e) {
      System.err.println("❌ ERREUR INTERNE LORS DE L'INSCRIPTION : " + e.getMessage());
      return ResponseEntity.status(500).body("Erreur interne du serveur lors de la création du compte.");
    }
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody AuthDto request) {

    System.out.println("=====================================");
    System.out.println("🔍 TENTATIVE DE CONNEXION");
    System.out.println("Identifiant reçu : [" + request.getEmail() + "]");
    System.out.println("=====================================");

    // On tente de trouver l'utilisateur soit par Email, soit par CIN
    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByEmail(request.getEmail());

    if (optionalUser.isEmpty()) {
      optionalUser = utilisateurRepository.findFirstByCin(request.getEmail());
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
    try {
      System.out.println("🔍 [DEBUG] Requete /me recue avec header: " + (authHeader != null ? "Present" : "Nul"));

      if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        System.out.println("❌ [DEBUG] Badge manquant ou format invalide");
        return ResponseEntity.status(401).body("Erreur : Badge manquant.");
      }

      String token = authHeader.substring(7);
      Long userId;
      try {
        userId = jwtUtils.extractId(token);
        System.out.println("🆔 [DEBUG] ID extrait du token: " + userId);
      } catch (Exception e) {
        System.err.println("❌ [DEBUG] Erreur extraction ID: " + e.getMessage());
        return ResponseEntity.status(401).body("Erreur : Badge invalide ou expiré.");
      }

      Optional<Utilisateur> optionalUser = utilisateurRepository.findById(userId);
      if (optionalUser.isEmpty()) {
        System.out.println("❌ [DEBUG] Utilisateur non trouve pour ID: " + userId);
        return ResponseEntity.status(404).body("Erreur : Utilisateur non trouvé.");
      }

      Utilisateur user = optionalUser.get();
      System.out.println("✅ [DEBUG] Utilisateur trouve: " + user.getNom() + " " + user.getPrenom());

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
    } catch (Exception e) {
      System.err.println("💥 [CRITICAL ERROR] Erreur dans /me : " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.status(500).body("Erreur interne du serveur : " + e.getMessage());
    }
  }

  @PutMapping("/update-profile")
  public ResponseEntity<?> updateProfile(
      @RequestHeader("Authorization") String authHeader,
      @RequestBody AuthDto request) {

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return ResponseEntity.status(401).body("Erreur : Badge manquant.");
    }

    String token = authHeader.substring(7);
    String email = jwtUtils.extractEmail(token);

    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByEmail(email);
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
    if (request.getTelephone() != null)
      user.setTelephone(request.getTelephone());

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

    @SuppressWarnings("null")
    final Utilisateur userToSave2 = user;
    @SuppressWarnings("null")
    Utilisateur userToProcess = userToSave2;
    utilisateurRepository.save(userToProcess);
    return ResponseEntity.ok("Profil mis à jour avec succès.");
  }

  @PutMapping("/change-password")
  public ResponseEntity<?> changePassword(
      @RequestHeader("Authorization") String authHeader,
      @RequestBody ChangePasswordDto request) {

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return ResponseEntity.status(401).body("Erreur : Badge manquant.");
    }

    String token = authHeader.substring(7);
    String email = jwtUtils.extractEmail(token);

    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByEmail(email);
    if (optionalUser.isEmpty()) {
      return ResponseEntity.status(404).body("Erreur : Utilisateur non trouvé.");
    }

    Utilisateur user = optionalUser.get();

    // Verify old password
    if (request.getOldPassword() == null || !passwordEncoder.matches(request.getOldPassword(), user.getMotDePasse())) {
      return ResponseEntity.badRequest().body("Erreur : L'ancien mot de passe est incorrect.");
    }

    // Check new password length (handled by frontend, but good to double check)
    if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
      return ResponseEntity.badRequest().body("Erreur : Le nouveau mot de passe doit contenir au moins 6 caractères.");
    }

    // Encode and save new password
    user.setMotDePasse(passwordEncoder.encode(request.getNewPassword()));
    utilisateurRepository.save(user);

    return ResponseEntity.ok("Votre mot de passe a été modifié avec succès.");
  }

  @GetMapping("/users")
  public ResponseEntity<java.util.List<Utilisateur>> getAllUsers() {
    return ResponseEntity.ok(utilisateurRepository.findAll());
  }

  @GetMapping("/detail/{id}")
  public ResponseEntity<AuthDto> getUserById(@PathVariable("id") Long id) {
    @SuppressWarnings("null")
    Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
    if (optionalUser.isEmpty()) {
      return ResponseEntity.notFound().build();
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
    if (user.getDateNaissance() != null) profile.setDateNaissance(user.getDateNaissance().toString());
    if (user.getDateDiplome() != null) profile.setDateDiplome(user.getDateDiplome().toString());
    return ResponseEntity.ok(profile);
  }

  @PutMapping("/utilisateurs/{id}")
  public ResponseEntity<?> updateUtilisateurById(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> data) {

    System.out.println("🔄 REQUÊTE DE MISE À JOUR UTILISATEUR [ID=" + id + "]");
    System.out.println("Données reçues : " + data);

    @SuppressWarnings("null")
    Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
    if (optionalUser.isEmpty()) {
      System.out.println("❌ ÉCHEC : Utilisateur " + id + " introuvable.");
      return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).body("Utilisateur introuvable");
    }

    Utilisateur user = optionalUser.get();
    System.out.println("Utilisateur trouvé : " + user.getEmail());

    if (data.containsKey("nom") && data.get("nom") != null) {
      user.setNom((String) data.get("nom"));
    }
    if (data.containsKey("prenom") && data.get("prenom") != null) {
      user.setPrenom((String) data.get("prenom"));
    }
    if (data.containsKey("cin") && data.get("cin") != null) {
      user.setCin((String) data.get("cin"));
    }
    if (data.containsKey("nationalite") && data.get("nationalite") != null) {
      user.setNationalite((String) data.get("nationalite"));
    }
    if (data.containsKey("faculte") && data.get("faculte") != null) {
      user.setFaculte((String) data.get("faculte"));
    }
    if (data.containsKey("telephone") && data.get("telephone") != null) {
      user.setTelephone((String) data.get("telephone"));
    }
    if (data.containsKey("adresse") && data.get("adresse") != null) {
      user.setAdresse((String) data.get("adresse"));
    }
    if (data.containsKey("lieuNaissance") && data.get("lieuNaissance") != null) {
      user.setLieuNaissance((String) data.get("lieuNaissance"));
    }
    if (data.containsKey("dateNaissance") && data.get("dateNaissance") != null && !((String) data.get("dateNaissance")).isEmpty()) {
      try {
        user.setDateNaissance(LocalDate.parse((String) data.get("dateNaissance")));
      } catch (Exception e) {
        System.err.println("Erreur format dateNaissance : " + e.getMessage());
      }
    }
    if (data.containsKey("dateDiplome") && data.get("dateDiplome") != null && !((String) data.get("dateDiplome")).isEmpty()) {
      try {
        user.setDateDiplome(LocalDate.parse((String) data.get("dateDiplome")));
      } catch (Exception e) {
        System.err.println("Erreur format dateDiplome : " + e.getMessage());
      }
    }

    @SuppressWarnings("null")
    final Utilisateur userToSave = user;
    utilisateurRepository.save(userToSave);
    System.out.println("✅ SUCCÈS : Utilisateur [ID=" + id + "] mis à jour.");

    return ResponseEntity.ok("Utilisateur mis à jour avec succès");
  }

  @GetMapping("/candidat-id")
  public ResponseEntity<Long> getCandidatIdByCin(@RequestParam("cin") String cin) {
    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByCin(cin);
    if (optionalUser.isPresent()) {
      return ResponseEntity.ok(optionalUser.get().getId());
    } else {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping("/forgot-password")
  public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordDto request) {
    // 1. On cherche l'utilisateur par son CIN
    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByCin(request.getCin());
    
    if (optionalUser.isEmpty()) {
      return ResponseEntity.badRequest().body("Erreur : Aucun compte trouvé avec ce numéro d'identité.");
    }

    Utilisateur user = optionalUser.get();

    // 2. On vérifie si l'email saisi correspond à l'email de ce compte
    if (!user.getEmail().equalsIgnoreCase(request.getEmail())) {
      return ResponseEntity.badRequest().body("Erreur : Cette adresse email ne correspond pas à ce numéro d'identité.");
    }

    String code = String.format("%06d", new Random().nextInt(999999));
    user.setResetCode(code);
    user.setResetCodeExpiration(LocalDateTime.now().plusMinutes(15));
    utilisateurRepository.save(user);

    // Envoyer à n8n
    try {
      Map<String, Object> payload = new HashMap<>();
      payload.put("email", user.getEmail());
      payload.put("nom", user.getNom());
      payload.put("prenom", user.getPrenom());
      payload.put("resetCode", code);
      payload.put("timestamp", LocalDateTime.now().toString());

      restTemplate.postForEntity(n8nWebhookUrl, payload, String.class);
      System.out.println("✅ Code de reset envoyé à n8n pour : " + user.getEmail());
    } catch (Exception e) {
      System.err.println("❌ Erreur lors de l'envoi à n8n : " + e.getMessage());
    }

    return ResponseEntity.ok("Un code de réinitialisation a été envoyé à votre adresse email.");
  }

  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestBody ForgotPasswordDto request) {
    Optional<Utilisateur> optionalUser = utilisateurRepository.findFirstByEmail(request.getEmail());
    if (optionalUser.isEmpty()) {
      return ResponseEntity.badRequest().body("Erreur : Utilisateur introuvable.");
    }

    Utilisateur user = optionalUser.get();
    if (user.getResetCode() == null || !user.getResetCode().equals(request.getCode())) {
      return ResponseEntity.badRequest().body("Erreur : Code de réinitialisation invalide.");
    }

    if (user.getResetCodeExpiration().isBefore(LocalDateTime.now())) {
      return ResponseEntity.badRequest().body("Erreur : Le code a expiré.");
    }

    user.setMotDePasse(passwordEncoder.encode(request.getNewPassword()));
    user.setResetCode(null);
    user.setResetCodeExpiration(null);
    utilisateurRepository.save(user);

    return ResponseEntity.ok("Votre mot de passe a été réinitialisé avec succès.");
  }

  @GetMapping("/stats/candidates-count")
  public ResponseEntity<Long> getCandidatesCount() {
    return ResponseEntity.ok(utilisateurRepository.countByRole("CANDIDAT"));
  }

  @GetMapping("/stats/by-faculte")
  public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getStatsByFaculte(
      @RequestParam(value = "ids", required = false) java.util.List<Long> ids) {
    
    java.util.List<Object[]> results;
    
    if (ids == null) {
      results = utilisateurRepository.countByFaculteAll();
    } else if (ids.isEmpty()) {
      return ResponseEntity.ok(new java.util.ArrayList<>());
    } else {
      results = utilisateurRepository.countByFaculteFiltered(ids);
    }

    java.util.List<java.util.Map<String, Object>> response = new java.util.ArrayList<>();
    for (Object[] res : results) {
      response.add(java.util.Map.of(
          "faculte", res[0] != null ? res[0] : "Inconnue",
          "count", res[1]));
    }
    return ResponseEntity.ok(response);
  }
}
