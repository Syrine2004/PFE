package tn.sante.residanat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sante.residanat.model.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n WHERE n.candidatId = :candidatId AND (n.concoursId = :concoursId OR n.concoursId IS NULL) ORDER BY n.createdAt DESC")
    List<Notification> findNotificationsForCandidatAndConcours(@Param("candidatId") Long candidatId, @Param("concoursId") String concoursId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.candidatId = :candidatId AND (n.concoursId = :concoursId OR n.concoursId IS NULL) AND n.read = false")
    long countUnreadForCandidatAndConcours(@Param("candidatId") Long candidatId, @Param("concoursId") String concoursId);

    @Query("SELECT n FROM Notification n WHERE n.candidatId = :candidatId AND (n.concoursId = :concoursId OR n.concoursId IS NULL) AND n.read = false")
    List<Notification> findUnreadForCandidatAndConcours(@Param("candidatId") Long candidatId, @Param("concoursId") String concoursId);

    boolean existsByCandidatIdAndMessageContainingIgnoreCase(Long candidatId, String messagePart);
    boolean existsByCandidatIdAndTypeAndMessage(Long candidatId, Notification.NotificationType type, String message);
    boolean existsByCandidatIdAndConcoursIdAndTypeAndMessage(Long candidatId, String concoursId, Notification.NotificationType type, String message);
    long deleteByCandidatIdAndTypeAndMessage(Long candidatId, Notification.NotificationType type, String message);
}
