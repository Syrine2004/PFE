package tn.sante.reclamation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reclamations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reclamation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long candidatId;

    @Column(nullable = false)
    private String objet;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Categorie categorie;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priorite priorite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Statut statut;

    private LocalDateTime dateSoumission;
    
    private LocalDateTime dateTraitement;

    @Column(columnDefinition = "TEXT")
    private String reponseAdmin;

    @Column(columnDefinition = "TEXT")
    private String pieceJointe;

    @Column(name = "concours_id")
    private String concoursId;

    @Column
    private String attachmentName;
}
