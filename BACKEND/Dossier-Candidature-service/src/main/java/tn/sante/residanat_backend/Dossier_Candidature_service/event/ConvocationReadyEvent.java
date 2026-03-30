package tn.sante.residanat_backend.Dossier_Candidature_service.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

/**
 * Événement déclenché lorsque la convocation est prête.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConvocationReadyEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long dossierId;
    private Long candidatId;
    private String convocationHash;
}
