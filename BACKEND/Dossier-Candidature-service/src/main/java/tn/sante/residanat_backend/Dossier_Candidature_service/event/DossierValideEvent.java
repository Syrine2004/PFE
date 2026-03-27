package tn.sante.residanat_backend.Dossier_Candidature_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Événement déclenché lorsqu'un dossier est validé.
 * Utilisé pour notifier le convocation-service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DossierValideEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long dossierId;
    private Long candidatId;
    private UUID concoursId;
}
