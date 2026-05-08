package tn.sante.residanat.convocation.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "import_affectation_traces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportAffectationTrace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String name;
    
    private LocalDateTime importedAt;
    
    private Integer importedCount;
    
    @Column(name = "concours_id")
    private String concoursId;
    
    private String importedBy;
}
