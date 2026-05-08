package tn.sante.residanat_backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat_backend.models.Utilisateur;
import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

  // Cette ligne magique indique à Spring Boot comment chercher un utilisateur par
  // son email pour pouvoir le connecter !
  Optional<Utilisateur> findFirstByEmail(String email);

  // Chercher par CIN pour la connexion
  Optional<Utilisateur> findFirstByCin(String cin);



  // Cette ligne servira plus tard pour vérifier si un email est déjà utilisé lors
  // de l'inscription
  boolean existsByEmail(String email);

  // Vérifier si un CIN est déjà utilisé
  boolean existsByCin(String cin);

  java.util.List<Utilisateur> findByRole(String role);
  long countByRole(String role);

  @org.springframework.data.jpa.repository.Query("SELECT u.faculte, COUNT(u) FROM Utilisateur u WHERE u.role = 'CANDIDAT' AND u.id IN :ids GROUP BY u.faculte")
  java.util.List<Object[]> countByFaculteFiltered(@org.springframework.data.repository.query.Param("ids") java.util.List<Long> ids);

  @org.springframework.data.jpa.repository.Query("SELECT u.faculte, COUNT(u) FROM Utilisateur u WHERE u.role = 'CANDIDAT' GROUP BY u.faculte")
  java.util.List<Object[]> countByFaculteAll();
}
