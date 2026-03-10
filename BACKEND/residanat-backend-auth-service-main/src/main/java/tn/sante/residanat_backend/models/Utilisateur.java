package tn.sante.residanat_backend.models;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "utilisateurs")
public class Utilisateur {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String email;

  @Column(nullable = false)
  private String motDePasse;

  @Column(nullable = false)
  private String role; // "ADMIN" ou "CANDIDAT"

  // --- NOUVEAUX CHAMPS POUR LE DOSSIER COMPLET ---
  private String civilite;
  private String nom;
  private String prenom;
  private LocalDate dateNaissance;
  private String lieuNaissance;
  private String nationalite;
  private String adresse;

  @Column(unique = true)
  private String cin;

  @Column(nullable = false)
  private String typeDocumentIdentite = "CIN";

  private String telephone;
  private String faculte;
  private LocalDate dateDiplome;

  // 1. Constructeur vide (Obligatoire pour JPA)
  public Utilisateur() {
  }

  // 2. Constructeur complet
  public Utilisateur(String email, String motDePasse, String role, String civilite, String nom, String prenom,
      LocalDate dateNaissance, String lieuNaissance, String nationalite, String adresse,
      String cin, String typeDocumentIdentite, String telephone, String faculte, LocalDate dateDiplome) {
    this.email = email;
    this.motDePasse = motDePasse;
    this.role = role;
    this.civilite = civilite;
    this.nom = nom;
    this.prenom = prenom;
    this.dateNaissance = dateNaissance;
    this.lieuNaissance = lieuNaissance;
    this.nationalite = nationalite;
    this.adresse = adresse;
    this.cin = cin;
    this.typeDocumentIdentite = typeDocumentIdentite;
    this.telephone = telephone;
    this.faculte = faculte;
    this.dateDiplome = dateDiplome;
  }

  // 3. Getters et Setters
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

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
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

  public LocalDate getDateNaissance() {
    return dateNaissance;
  }

  public void setDateNaissance(LocalDate dateNaissance) {
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

  public LocalDate getDateDiplome() {
    return dateDiplome;
  }

  public void setDateDiplome(LocalDate dateDiplome) {
    this.dateDiplome = dateDiplome;
  }

  public String getTypeDocumentIdentite() {
    return typeDocumentIdentite;
  }

  public void setTypeDocumentIdentite(String typeDocumentIdentite) {
    this.typeDocumentIdentite = typeDocumentIdentite;
  }
}
