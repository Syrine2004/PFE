package tn.sante.resultat.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "resultats_candidat", indexes = {
    @Index(name = "idx_resultat_candidatId", columnList = "candidat_id"),
    @Index(name = "idx_resultat_concoursId", columnList = "concours_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultatCandidat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Transient ID for linking with User/Candidate
    @Column(name = "candidat_id")
    private Long candidatId;

    // Transient ID for linking with Concours Service
    @Column(name = "concours_id")
    private String concoursId;

    // Data imported from Ministry Excel
    @Column(name = "numero_convocation")
    private String numeroConvocation;

    @Column(name = "cin")
    private String cin;

    @Column(name = "nom_prenom")
    private String nomPrenom;

    @Column(name = "note_epreuve_1")
    private Double noteEpreuve1;

    @Column(name = "note_epreuve_2")
    private Double noteEpreuve2;

    @Column(name = "moyenne_generale")
    private Double moyenneGenerale;

    @Column(name = "rang")
    private Integer rang;

    @Column(name = "statut")
    private String statut; // e.g. "Admis(e)", "Ajourné(e)"

    @Column(name = "hash_securise", unique = true)
    private String hashSecurise;
}
