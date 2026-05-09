package tn.sante.reclamation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sante.reclamation.dto.ReclamationCreeeEvent;
import tn.sante.reclamation.entity.Categorie;
import tn.sante.reclamation.entity.Priorite;
import tn.sante.reclamation.entity.Reclamation;
import tn.sante.reclamation.entity.Statut;
import tn.sante.reclamation.repository.ReclamationRepository;
import tn.sante.reclamation.security.SecurityUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamationCandidateService {

    private final ReclamationRepository reclamationRepository;
    private final RabbitTemplate rabbitTemplate;

    public List<Reclamation> getMyReclamations(String concoursId) {
        Long candidatId = SecurityUtils.getCurrentUserId();
        log.info("Fetching reclamations for candidate ID: {} in concours: {}", candidatId, concoursId);
        
        // Handle "null" string from frontend or real null
        if (concoursId != null && !concoursId.isEmpty() && !concoursId.equalsIgnoreCase("null")) {
            return reclamationRepository.findByCandidatIdAndConcoursIdOrderByDateSoumissionDesc(candidatId, concoursId);
        }
        
        // If no concoursId is specified, we return ONLY reclamations that have NO concoursId 
        // OR we can decide to return nothing. The user complained about seeing reclamations of 
        // the published concours even when in another context, so we enforce isolation.
        return reclamationRepository.findByCandidatIdAndConcoursIdIsNullOrderByDateSoumissionDesc(candidatId);
    }

    @Transactional
    public Reclamation submitReclamation(String objet, String description, String pieceJointe, String attachmentName, String concoursId) {
        Long candidatId = SecurityUtils.getCurrentUserId();
        if (candidatId == null) {
            throw new RuntimeException("Utilisateur non authentifié. Veuillez vous reconnecter.");
        }
        
        log.info("New reclamation submission from candidate {}: {}", candidatId, objet);

        Reclamation reclamation = new Reclamation();
        reclamation.setCandidatId(candidatId);
        reclamation.setObjet(objet);
        reclamation.setDescription(description);
        reclamation.setPieceJointe(pieceJointe);
        reclamation.setAttachmentName(attachmentName);
        reclamation.setConcoursId(concoursId);
        reclamation.setDateSoumission(LocalDateTime.now());
        reclamation.setStatut(Statut.SOUMISE);

        // --- AI Keyword and Predefined Category mapping ---
        String lowerObjet = (objet != null) ? objet.toLowerCase() : "";
        String lowerDesc = (description != null) ? description.toLowerCase() : "";
        
        log.info("[AI-DEBUG] Analyzing reclamation. Object: '{}', Description Snippet: '{}'", 
                 lowerObjet, lowerDesc.length() > 50 ? lowerDesc.substring(0, 50) + "..." : lowerDesc);

        // Defaults
        Categorie targetCategory = Categorie.AUTRE;
        Priorite targetPriority = Priorite.MOYENNE;

        // 1. Analyze description (Smart AI-like fallback) - High Priority
        if (lowerDesc.contains("nom") || lowerDesc.contains("prénom") || lowerDesc.contains("prenom") || 
            lowerDesc.contains("cin") || lowerDesc.contains("personnelle") || lowerDesc.contains("identit") ||
            lowerDesc.contains("email") || lowerDesc.contains("mail") || lowerDesc.contains("téléphone") || lowerDesc.contains("tél")) {
            log.info("[AI-DEBUG] Detected category: PERSONNELLE from description");
            targetCategory = Categorie.PERSONNELLE;
            targetPriority = Priorite.MOYENNE;
        } else if (lowerDesc.contains("note") || lowerDesc.contains("resultat") || lowerDesc.contains("score") || lowerDesc.contains("moyenne")) {
            log.info("[AI-DEBUG] Detected category: RESULTAT from description");
            targetCategory = Categorie.RESULTAT;
            targetPriority = Priorite.URGENTE;
        } else if (lowerDesc.contains("connexion") || lowerDesc.contains("technique") || lowerDesc.contains("bug") || lowerDesc.contains("site")) {
            log.info("[AI-DEBUG] Detected category: TECHNIQUE from description");
            targetCategory = Categorie.TECHNIQUE;
            targetPriority = Priorite.HAUTE;
        } else if (lowerDesc.contains("dossier") || lowerDesc.contains("inscription") || lowerDesc.contains("validation") || lowerDesc.contains("convocation")) {
            log.info("[AI-DEBUG] Detected category: INSCRIPTION from description");
            targetCategory = Categorie.INSCRIPTION;
            targetPriority = Priorite.MOYENNE;
        }
        
        // 2. Refine based on Object ONLY if description analysis resulted in AUTRE
        if (targetCategory == Categorie.AUTRE) {
            if (lowerObjet.contains("score") || lowerObjet.contains("classement") || lowerObjet.contains("resultat")) {
                targetCategory = Categorie.RESULTAT;
                targetPriority = Priorite.URGENTE;
            } else if (lowerObjet.contains("technique") || lowerObjet.contains("bug") || lowerObjet.contains("plateforme")) {
                targetCategory = Categorie.TECHNIQUE;
                targetPriority = Priorite.HAUTE;
            } else if (lowerObjet.contains("personnelle") || lowerObjet.contains("données") || 
                       lowerObjet.contains("nom") || lowerObjet.contains("prénom") || lowerObjet.contains("identit")) {
                targetCategory = Categorie.PERSONNELLE;
                targetPriority = Priorite.MOYENNE;
            }
            // If it was INSCRIPTION and nothing better found in objet, it stays INSCRIPTION
            // If it was AUTRE and nothing better found, it stays AUTRE
        }

        log.info("[AI-DEBUG] Final Mapping -> Category: {}, Priority: {}", targetCategory, targetPriority);
        reclamation.setCategorie(targetCategory);
        reclamation.setPriorite(targetPriority);

        log.info("AI Analysis result: Category={}, Priority={}", targetCategory, targetPriority);

        Reclamation saved = reclamationRepository.save(reclamation);

        // Publish event for notification service
        try {
            ReclamationCreeeEvent event = ReclamationCreeeEvent.builder()
                    .reclamationId(saved.getId())
                    .candidatId(candidatId)
                    .concoursId(concoursId)
                    .objet(objet)
                    .dateSoumission(saved.getDateSoumission())
                    .build();
            rabbitTemplate.convertAndSend("reclamation.exchange", "reclamation.creee", event);
            log.info("Event reclamation.creee sent for reclamation {}", saved.getId());
        } catch (Exception e) {
            log.error("Failed to send reclamation.creee event", e);
        }

        return saved;
    }
}
