package tn.sante.resultat.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultatCandidatPublieEvent {
    private Long candidatId;
    private String concoursId;
    private String statut;
    private LocalDateTime timestamp;
}
