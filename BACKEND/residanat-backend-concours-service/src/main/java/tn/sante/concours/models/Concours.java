package tn.sante.concours.models;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "concours")
@SQLDelete(sql = "UPDATE concours SET deleted = true WHERE id=?")
@Where(clause = "deleted=false") // Par defaut on ne recupere que les non supprimés (soft delete)
public class Concours {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String typeConcours;

    @Column(nullable = false, length = 150)
    private String libelle;

    @Column(nullable = false)
    private Integer annee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutResultat statutResultat = StatutResultat.NON_PUBLIE;

    @Column(updatable = false)
    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    @Column(updatable = false)
    private String createdBy;

    private String updatedBy;

    @Column(nullable = false)
    private boolean deleted = false;

    public Concours() {
    }

    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
        this.dateModification = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateModification = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTypeConcours() {
        return typeConcours;
    }

    public void setTypeConcours(String typeConcours) {
        this.typeConcours = typeConcours;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public Integer getAnnee() {
        return annee;
    }

    public void setAnnee(Integer annee) {
        this.annee = annee;
    }

    public StatutResultat getStatutResultat() {
        return statutResultat;
    }

    public void setStatutResultat(StatutResultat statutResultat) {
        this.statutResultat = statutResultat;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateModification() {
        return dateModification;
    }

    public void setDateModification(LocalDateTime dateModification) {
        this.dateModification = dateModification;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
