package tn.sante.residanat.convocation.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "affectations_ministere", 
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_affectation_cin_concours", columnNames = {"cin", "concours_id"})
       },
       indexes = {
           @Index(name = "idx_affectation_cin", columnList = "cin"),
           @Index(name = "idx_affectation_concours", columnList = "concours_id")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class AffectationCandidat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "num_ministere", length = 20)
    private String num;

    @Column(name = "cin", nullable = false, length = 20)
    private String cin;

    @Column(name = "concours_id", nullable = false, length = 36)
    private String concoursId;

    @Column(name = "nom", length = 100)
    private String nom;

    @Column(name = "prenom", length = 100)
    private String prenom;

    @Column(name = "faculte", length = 150)
    private String fac;

    @Column(name = "salle", length = 100)
    private String salle;

    @Column(name = "n_place")
    private Integer nPlace;
    
    // Année du concours pour filtrage ultérieur
    @Column(name = "annee_concours")
    private Integer anneeConcours;
}
