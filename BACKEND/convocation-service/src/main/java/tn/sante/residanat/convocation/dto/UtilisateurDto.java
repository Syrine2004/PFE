package tn.sante.residanat.convocation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * DTO pour les données utilisateur (candidat)
 * Fourni par le service d'authentification via Feign
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class UtilisateurDto {

    private Long id;
    private String nom;
    private String prenom;
    private String cin;
    private String email;

    // Constructeurs
    public UtilisateurDto() {}

    public UtilisateurDto(Long id, String nom, String prenom, String cin, String email) {
        this.id = id;
        this.nom = nom;
        this.prenom = prenom;
        this.cin = cin;
        this.email = email;
    }

    // Getters
    public Long getId() { return id; }
    public String getNom() { return nom; }
    public String getPrenom() { return prenom; }
    public String getCin() { return cin; }
    public String getEmail() { return email; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setNom(String nom) { this.nom = nom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public void setCin(String cin) { this.cin = cin; }
    public void setEmail(String email) { this.email = email; }
}
