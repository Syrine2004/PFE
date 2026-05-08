package tn.sante.residanat.convocation.event;

import java.io.Serializable;

/**
 * Événement déclenché lorsque la convocation est prête.
 */
public class ConvocationReadyEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long dossierId;
    private Long candidatId;
    private String concoursId;
    private String convocationHash;

    public ConvocationReadyEvent() {
    }

    public ConvocationReadyEvent(Long dossierId, Long candidatId, String concoursId, String convocationHash) {
        this.dossierId = dossierId;
        this.candidatId = candidatId;
        this.concoursId = concoursId;
        this.convocationHash = convocationHash;
    }

    public Long getDossierId() {
        return dossierId;
    }

    public void setDossierId(Long dossierId) {
        this.dossierId = dossierId;
    }

    public Long getCandidatId() {
        return candidatId;
    }

    public void setCandidatId(Long candidatId) {
        this.candidatId = candidatId;
    }

    public String getConvocationHash() {
        return convocationHash;
    }

    public void setConvocationHash(String convocationHash) {
        this.convocationHash = convocationHash;
    }

    public String getConcoursId() {
        return concoursId;
    }

    public void setConcoursId(String concoursId) {
        this.concoursId = concoursId;
    }
}
