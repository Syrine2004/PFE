package tn.sante.residanat_backend.Dossier_Candidature_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DossierRejeteEvent {
    private Long dossierId;
    private Long candidatId;
    private String motif;
}
