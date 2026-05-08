package tn.sante.concours.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ResultatsPubliesEvent {
    private UUID concoursId;
    private String typeConcours;
    private Integer annee;
    private LocalDateTime datePublication;
    private String message;

    public ResultatsPubliesEvent() {
    }

    public UUID getConcoursId() { return concoursId; }
    public void setConcoursId(UUID concoursId) { this.concoursId = concoursId; }

    public String getTypeConcours() { return typeConcours; }
    public void setTypeConcours(String typeConcours) { this.typeConcours = typeConcours; }

    public Integer getAnnee() { return annee; }
    public void setAnnee(Integer annee) { this.annee = annee; }

    public LocalDateTime getDatePublication() { return datePublication; }
    public void setDatePublication(LocalDateTime datePublication) { this.datePublication = datePublication; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
