package tn.sante.concours.dto;

import java.util.UUID;

public class ResultatCandidatDto {
    private UUID id;
    private Long numeroConvocation;
    private String cinOrPassport;
    private String nomPrenom;
    private Double noteEpreuve1;
    private Double noteEpreuve2;
    private Double moyenneGenerale;
    private Integer rang;
    private String statut;
    private UUID concoursId;
    private UUID candidatId;

    public ResultatCandidatDto() {
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
}
