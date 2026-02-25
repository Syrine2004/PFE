package tn.sante.concours.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tn.sante.concours.models.StatutResultat;

public class ConcoursRequestDTO {

    @NotBlank(message = "Le type de concours est obligatoire")
    private String typeConcours;

    @NotBlank(message = "Le libellé est obligatoire")
    private String libelle;

    @NotNull(message = "L'année est obligatoire")
    @Min(value = 1900, message = "Année non valide")
    @Max(value = 2100, message = "Année non valide")
    private Integer annee;

    private StatutResultat statutResultat;

    public ConcoursRequestDTO() {
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
}
