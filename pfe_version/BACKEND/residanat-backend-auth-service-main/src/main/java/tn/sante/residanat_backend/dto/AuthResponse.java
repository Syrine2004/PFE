package tn.sante.residanat_backend.dto;

public class AuthResponse {
  private String token;
  private String role;
  private Long id;
  private String nom;
  private String prenom;
  private String email;

  public AuthResponse(String token, String role, Long id, String nom, String prenom, String email) {
    this.token = token;
    this.role = role;
    this.id = id;
    this.nom = nom;
    this.prenom = prenom;
    this.email = email;
  }

  // Les Getters et Setters pour que Spring puisse lire les données
  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getNom() {
    return nom;
  }

  public void setNom(String nom) {
    this.nom = nom;
  }

  public String getPrenom() {
    return prenom;
  }

  public void setPrenom(String prenom) {
    this.prenom = prenom;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }
}
