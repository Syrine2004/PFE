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
    public List<Notification> getNotifications(@PathVariable Long candidatId) {
        return notificationRepository.findByCandidatIdOrderByCreatedAtDesc(candidatId);
    }

    @GetMapping("/candidat/{candidatId}/unread-count")
    public long getUnreadCount(@PathVariable Long candidatId) {
        return notificationRepository.countByCandidatIdAndReadFalse(candidatId);
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
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long candidatId) {
        List<Notification> unread = notificationRepository.findByCandidatIdAndReadFalse(candidatId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok().build();
    }
}
