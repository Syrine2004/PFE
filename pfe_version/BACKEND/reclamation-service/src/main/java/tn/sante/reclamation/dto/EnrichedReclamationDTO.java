package tn.sante.reclamation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sante.reclamation.entity.Categorie;
import tn.sante.reclamation.entity.Priorite;
import tn.sante.reclamation.entity.Statut;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedReclamationDTO {
    private Long id;
    private Long candidatId;
    private String candidateFullName;
    private String candidateCin;
    private String candidateEmail;
    
    private String objet;
    private String description;
    private Categorie categorie;
    private Priorite priorite;
    private Statut statut;
    
    private LocalDateTime dateSoumission;
    private LocalDateTime dateTraitement;
    private String reponseAdmin;
    private String pieceJointe;
    private String attachmentName;
    private String concoursId;
}
