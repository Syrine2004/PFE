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
public class ResultatsPubliesEvent {
    private String concoursId;
    private String message;
    private LocalDateTime timestamp;
}
