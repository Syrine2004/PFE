package tn.sante.residanat.convocation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DossierDto {
    private Long id;
    private Long candidatId;
    private UUID concoursId;
    private String statut;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCandidatId() { return candidatId; }
    public void setCandidatId(Long candidatId) { this.candidatId = candidatId; }
    public UUID getConcoursId() { return concoursId; }
    public void setConcoursId(UUID concoursId) { this.concoursId = concoursId; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
}
