package tn.sante.residanat.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sante.residanat.model.Notification;
import tn.sante.residanat.repository.NotificationRepository;
import tn.sante.residanat.service.IntegrationService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final IntegrationService integrationService;

    public NotificationController(NotificationRepository notificationRepository, IntegrationService integrationService) {
        this.notificationRepository = notificationRepository;
        this.integrationService = integrationService;
    }


    @GetMapping("/candidat/{candidatId}")
    public List<Notification> getNotifications(
            @PathVariable Long candidatId,
            @RequestParam(required = false) String concoursId) {
        if (concoursId != null && !concoursId.isEmpty()) {
            return notificationRepository.findNotificationsForCandidatAndConcours(candidatId, concoursId);
        }
        // Fallback to empty list or you could return all if needed. For strict isolation, empty is safer if no concours is specified.
        // Or if you want to support legacy fetching, we can leave a findByCandidatId... but we deleted it from the interface.
        // Let's re-add findByCandidatIdOrderByCreatedAtDesc to the repository in case.
        return List.of(); 
    }

    @GetMapping("/candidat/{candidatId}/unread-count")
    public long getUnreadCount(
            @PathVariable Long candidatId,
            @RequestParam(required = false) String concoursId) {
        if (concoursId != null && !concoursId.isEmpty()) {
            return notificationRepository.countUnreadForCandidatAndConcours(candidatId, concoursId);
        }
        return 0;
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/candidat/{candidatId}/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable Long candidatId,
            @RequestParam(required = false) String concoursId) {
        List<Notification> unread;
        if (concoursId != null && !concoursId.isEmpty()) {
            unread = notificationRepository.findUnreadForCandidatAndConcours(candidatId, concoursId);
        } else {
            return ResponseEntity.badRequest().build();
        }
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok().build();
    }
}
