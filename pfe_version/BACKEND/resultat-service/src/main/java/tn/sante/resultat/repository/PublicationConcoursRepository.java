package tn.sante.resultat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.resultat.model.PublicationConcours;

import java.util.Optional;

@Repository
public interface PublicationConcoursRepository extends JpaRepository<PublicationConcours, String> {
}
