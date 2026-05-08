package tn.sante.residanat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationClotureeEvent {
    private Long reclamationId;
    private Long candidatId;
    private String concoursId;
    private String objet;
    private String statut; // CLOTUREE_ACCEPTEE or CLOTUREE_REJETEE
    private String reponseAdmin;
}
