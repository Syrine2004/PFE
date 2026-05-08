package tn.sante.reclamation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sante.reclamation.entity.Statut;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationClotureeEvent {
    private Long reclamationId;
    private Long candidatId;
    private String concoursId;
    private String objet;
    private Statut statut;
    private String reponseAdmin;
    private LocalDateTime dateTraitement;
}
