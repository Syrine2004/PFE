package tn.sante.resultat.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "publication_concours")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicationConcours {

    @Id
    @Column(name = "concours_id")
    private String concoursId;

    @Column(name = "publie")
    private boolean publie;
}
