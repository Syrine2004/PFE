package tn.sante.residanat.convocation.event;

import java.util.UUID;

/**
 * Événement asynchrone déclenché quand un dossier de candidature est validé.
 * Reçu via RabbitMQ pour initier la génération de convocation.
 */
public class DossierValideEvent {

    /**
     * Identifiant du dossier de candidature validé
     */
    private Long dossierId;

    /**
     * Identifiant du candidat (utilisateur)
     */
    private Long candidatId;

    /**
     * Identifiant du concours auquel le candidat participe
     */
    private UUID concoursId;

    // Constructeurs
    public DossierValideEvent() {}

    public DossierValideEvent(Long dossierId, Long candidatId, UUID concoursId) {
        this.dossierId = dossierId;
        this.candidatId = candidatId;
        this.concoursId = concoursId;
    }

    // Getters
    public Long getDossierId() { return dossierId; }
    public Long getCandidatId() { return candidatId; }
    public UUID getConcoursId() { return concoursId; }

    // Setters
    public void setDossierId(Long dossierId) { this.dossierId = dossierId; }
    public void setCandidatId(Long candidatId) { this.candidatId = candidatId; }
    public void setConcoursId(UUID concoursId) { this.concoursId = concoursId; }
}
