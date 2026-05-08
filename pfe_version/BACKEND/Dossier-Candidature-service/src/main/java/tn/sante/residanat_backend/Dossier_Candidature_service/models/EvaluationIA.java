package tn.sante.residanat_backend.Dossier_Candidature_service.models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations_ia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationIA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double score; // Global average score

    private Double scoreCin;

    private Double scoreDiplome;
    
    private Double scorePhoto;

    private String analysisBatchId;

    @Builder.Default
    private Integer expectedChecks = 0;

    @Builder.Default
    private Integer completedChecks = 0;

    @Builder.Default
    private String analysisStatus = "IDLE";

    @Column(columnDefinition = "TEXT")
    private String anomalies; // Stocké en JSON ou texte simple

    @Builder.Default
    private boolean verifie = false;

    private LocalDateTime dateEvaluation;

    @JsonBackReference
    @OneToOne
    @JoinColumn(name = "dossier_id")
    private DossierCandidature dossier;

    @PrePersist
    protected void onCreate() {
        this.dateEvaluation = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateEvaluation = LocalDateTime.now();
    }
}
