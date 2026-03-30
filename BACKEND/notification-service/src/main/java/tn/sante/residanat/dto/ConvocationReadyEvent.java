package tn.sante.residanat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConvocationReadyEvent {
    private Long dossierId;
    private Long candidatId;
    private String hashSecurise;
}
