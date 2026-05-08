package tn.sante.resultat.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "import_resultat_traces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportResultatTrace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    
    private LocalDateTime importedAt;
    
    private Integer importedCount;
    
    @Column(name = "concours_id")
    private String concoursId;
    
    private String importedBy;
}
