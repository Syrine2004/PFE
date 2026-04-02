package tn.sante.residanat.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(
    name = "notifications",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_notifications_candidat_type_message", columnNames = {"candidat_id", "type", "message"})
    },
    indexes = {
        @Index(name = "idx_notifications_candidat_created_at", columnList = "candidat_id,created_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    private static final ZoneId TUNIS_ZONE = ZoneId.of("Africa/Tunis");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidat_id")
    private Long candidatId;

    @Column(name = "message", length = 512)
    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_read")
    private boolean read;

    public enum NotificationType {
        SUCCESS, ERROR, INFO
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(TUNIS_ZONE);
        read = false;
    }
}
