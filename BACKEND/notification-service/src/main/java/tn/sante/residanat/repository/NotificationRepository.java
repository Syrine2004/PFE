package tn.sante.residanat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.model.Notification;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCandidatIdOrderByCreatedAtDesc(Long candidatId);
    long countByCandidatIdAndReadFalse(Long candidatId);
    List<Notification> findByCandidatIdAndReadFalse(Long candidatId);
    boolean existsByCandidatIdAndMessageContainingIgnoreCase(Long candidatId, String messagePart);
}
