package tn.sante.resultat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultatCandidatDto {
    private Long id;
    private Long candidatId;
    private String concoursId;
    private String numeroConvocation;
    private String cin;
    private String nomPrenom;
    private Double noteEpreuve1;
    private Double noteEpreuve2;
    private Double moyenneGenerale;
    private Integer rang;
    private String statut;
    private String hashSecurise;
}
