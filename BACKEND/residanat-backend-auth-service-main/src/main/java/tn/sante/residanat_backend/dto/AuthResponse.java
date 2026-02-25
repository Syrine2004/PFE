package tn.sante.residanat_backend.dto;

public class AuthResponse {
  private String token;
  private String role;
  private Long id;

  public AuthResponse(String token, String role, Long id) {
    this.token = token;
    this.role = role;
    this.id = id;
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
}
