package tn.sante.residanat.convocation.event;

import lombok.*;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EligibilityFailedEvent implements Serializable {
    private Long candidatId;
    private Long dossierId;
    private String reason;
}
