package tn.sante.residanat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private Long dossierId;
    private Long candidatId;
    private String status; // VALIDE, REJETE, CONVOCATION_READY
    private String message;
}
