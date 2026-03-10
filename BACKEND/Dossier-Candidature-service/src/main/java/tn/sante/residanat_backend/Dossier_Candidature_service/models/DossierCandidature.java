package tn.sante.residanat_backend.Dossier_Candidature_service.models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dossiers_candidature", uniqueConstraints = @UniqueConstraint(columnNames = { "candidat_id",
        "concours_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierCandidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long candidatId;

    @Column(nullable = false)
    private UUID concoursId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutDossier statut = StatutDossier.EN_ATTENTE;

    private LocalDateTime dateSoumission;

    @Column
    private String dateDiplome;

    @JsonManagedReference
    @OneToMany(mappedBy = "dossier", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> documents = new ArrayList<>();

    @JsonManagedReference
    @OneToOne(mappedBy = "dossier", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private EvaluationIA evaluationIA;

    @PrePersist
    protected void onPersist() {
        this.dateSoumission = LocalDateTime.now();
    }

    public void addDocument(Document document) {
        documents.add(document);
        document.setDossier(this);
    }

    public void removeDocument(Document document) {
        documents.remove(document);
        document.setDossier(null);
    }
}
