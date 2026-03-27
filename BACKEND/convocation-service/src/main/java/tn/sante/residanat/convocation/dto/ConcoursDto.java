package tn.sante.residanat.convocation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ConcoursDto {

    private UUID id;
    private String libelle;
    private LocalDateTime dateDebut;
    private String lieuExamen;

    public ConcoursDto() {}

    public ConcoursDto(UUID id, String libelle, LocalDateTime dateDebut, String lieuExamen) {
        this.id = id;
        this.libelle = libelle;
        this.dateDebut = dateDebut;
        this.lieuExamen = lieuExamen;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }
    public String getLieuExamen() { return lieuExamen; }
    public void setLieuExamen(String lieuExamen) { this.lieuExamen = lieuExamen; }
}
