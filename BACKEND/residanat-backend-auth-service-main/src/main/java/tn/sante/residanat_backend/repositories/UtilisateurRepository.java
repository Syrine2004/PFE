package tn.sante.residanat_backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat_backend.models.Utilisateur;
import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

  // Cette ligne magique indique à Spring Boot comment chercher un utilisateur par
  // son email pour pouvoir le connecter !
  Optional<Utilisateur> findByEmail(String email);

  // Chercher par CIN pour la connexion
  Optional<Utilisateur> findByCin(String cin);

  // Cette ligne servira plus tard pour vérifier si un email est déjà utilisé lors
  // de l'inscription
  boolean existsByEmail(String email);

  // Vérifier si un CIN est déjà utilisé
  boolean existsByCin(String cin);

  java.util.List<Utilisateur> findByRole(String role);
}
