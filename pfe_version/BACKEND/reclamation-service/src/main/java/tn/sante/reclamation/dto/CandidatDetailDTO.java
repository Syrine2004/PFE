package tn.sante.reclamation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidatDetailDTO {
    private Long id;
    private String nom;
    private String prenom;
    private String cin;
    private String email;
    private String speciality; // Optional
}
