package tn.sante.concours.models;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resultats_candidats")
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE resultats_candidats SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class ResultatCandidat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long numeroConvocation;

    @Column(nullable = false, length = 50)
    private String cinOrPassport;

    @Column(nullable = false, length = 150)
    private String nomPrenom;

    @Column(nullable = false)
    private Double noteEpreuve1;

    @Column(nullable = false)
    private Double noteEpreuve2;

    @Column(nullable = false)
    private Double moyenneGenerale;

    @Column(nullable = false)
    private Integer rang;

    @Column(nullable = false, length = 50)
    private String statut;

    @Column(nullable = false)
    private UUID concoursId;

    @Column(nullable = true)
    private UUID candidatId;

    @Column(updatable = false)
    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    @Column(nullable = false)
    private boolean deleted = false;

    public ResultatCandidat() {
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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public Long getNumeroConvocation() { return numeroConvocation; }
    public void setNumeroConvocation(Long numeroConvocation) { this.numeroConvocation = numeroConvocation; }

    public String getCinOrPassport() { return cinOrPassport; }
    public void setCinOrPassport(String cinOrPassport) { this.cinOrPassport = cinOrPassport; }

    public String getNomPrenom() { return nomPrenom; }
    public void setNomPrenom(String nomPrenom) { this.nomPrenom = nomPrenom; }

    public Double getNoteEpreuve1() { return noteEpreuve1; }
    public void setNoteEpreuve1(Double noteEpreuve1) { this.noteEpreuve1 = noteEpreuve1; }

    public Double getNoteEpreuve2() { return noteEpreuve2; }
    public void setNoteEpreuve2(Double noteEpreuve2) { this.noteEpreuve2 = noteEpreuve2; }

    public Double getMoyenneGenerale() { return moyenneGenerale; }
    public void setMoyenneGenerale(Double moyenneGenerale) { this.moyenneGenerale = moyenneGenerale; }

    public Integer getRang() { return rang; }
    public void setRang(Integer rang) { this.rang = rang; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public UUID getConcoursId() { return concoursId; }
    public void setConcoursId(UUID concoursId) { this.concoursId = concoursId; }

    public UUID getCandidatId() { return candidatId; }
    public void setCandidatId(UUID candidatId) { this.candidatId = candidatId; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public LocalDateTime getDateModification() { return dateModification; }
    public void setDateModification(LocalDateTime dateModification) { this.dateModification = dateModification; }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
