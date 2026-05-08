package tn.sante.reclamation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationCreeeEvent {
    private Long reclamationId;
    private Long candidatId;
    private String concoursId;
    private String objet;
    private LocalDateTime dateSoumission;
}
