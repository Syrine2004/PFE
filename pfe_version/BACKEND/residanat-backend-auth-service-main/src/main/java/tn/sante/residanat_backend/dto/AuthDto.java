package tn.sante.residanat_backend.dto;

public class AuthDto {

  private Long id;
  private String email;
  private String motDePasse;

  // --- NOUVEAUX CHAMPS POUR CAPTURER LES DONNÉES DU FORMULAIRE ---
  private String civilite;
  private String nom;
  private String prenom;
  private String dateNaissance; // Reçu en String (ex: "1995-10-25")
  private String lieuNaissance;
  private String nationalite;
  private String adresse;
  private String cin;
  private String telephone;
  private String faculte;
  private String dateDiplome;
  
  private String typeDocumentIdentite;

  // Constructeur vide
  public AuthDto() {
  }

  // Getters et Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getMotDePasse() {
    return motDePasse;
  }

  public void setMotDePasse(String motDePasse) {
    this.motDePasse = motDePasse;
  }

  public String getCivilite() {
    return civilite;
  }

  public void setCivilite(String civilite) {
    this.civilite = civilite;
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

  public String getDateNaissance() {
    return dateNaissance;
  }

  public void setDateNaissance(String dateNaissance) {
    this.dateNaissance = dateNaissance;
  }

  public String getLieuNaissance() {
    return lieuNaissance;
  }

  public void setLieuNaissance(String lieuNaissance) {
    this.lieuNaissance = lieuNaissance;
  }

  public String getNationalite() {
    return nationalite;
  }

  public void setNationalite(String nationalite) {
    this.nationalite = nationalite;
  }

  public String getAdresse() {
    return adresse;
  }

  public void setAdresse(String adresse) {
    this.adresse = adresse;
  }

  public String getCin() {
    return cin;
  }

  public void setCin(String cin) {
    this.cin = cin;
  }

  public String getTelephone() {
    return telephone;
  }

  public void setTelephone(String telephone) {
    this.telephone = telephone;
  }

  public String getFaculte() {
    return faculte;
  }

  public void setFaculte(String faculte) {
    this.faculte = faculte;
  }

  public String getDateDiplome() {
    return dateDiplome;
  }

  public void setDateDiplome(String dateDiplome) {
    this.dateDiplome = dateDiplome;
  }

  public String getTypeDocumentIdentite() {
    return typeDocumentIdentite;
  }

  public void setTypeDocumentIdentite(String typeDocumentIdentite) {
    this.typeDocumentIdentite = typeDocumentIdentite;
  }
}
