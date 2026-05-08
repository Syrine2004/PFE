package tn.sante.reclamation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sante.reclamation.dto.CandidatDetailDTO;
import tn.sante.reclamation.dto.EnrichedReclamationDTO;
import tn.sante.reclamation.dto.ReclamationClotureeEvent;
import tn.sante.reclamation.dto.ReclamationDashboardStatsDTO;
import tn.sante.reclamation.entity.Categorie;
import tn.sante.reclamation.entity.Priorite;
import tn.sante.reclamation.entity.Reclamation;
import tn.sante.reclamation.entity.Statut;
import tn.sante.reclamation.repository.ReclamationRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamationAdminService {

    private final ReclamationRepository reclamationRepository;
    private final RabbitTemplate rabbitTemplate;
    private final AuthServiceClient authServiceClient;

    public List<EnrichedReclamationDTO> getReclamationsEnrichies(Statut statut, Priorite priorite, Categorie categorie, String concoursId) {
        log.info("Fetching enriched reclamations - Statut: {}, Priorite: {}, Categorie: {}, Concours: {}", statut, priorite, categorie, concoursId);
        List<Reclamation> reclamations = reclamationRepository.findWithFilters(statut, priorite, categorie, concoursId);
        
        return reclamations.stream()
                .map(this::enrichir)
                .toList();
    }

    private EnrichedReclamationDTO enrichir(Reclamation r) {
        CandidatDetailDTO details = authServiceClient.getCandidateDetails(r.getCandidatId());
        return EnrichedReclamationDTO.builder()
                .id(r.getId())
                .candidatId(r.getCandidatId())
                .candidateFullName(details.getPrenom() + " " + details.getNom())
                .candidateCin(details.getCin())
                .candidateEmail(details.getEmail())
                .objet(r.getObjet())
                .description(r.getDescription())
                .categorie(r.getCategorie())
                .priorite(r.getPriorite())
                .statut(r.getStatut())
                .dateSoumission(r.getDateSoumission())
                .dateTraitement(r.getDateTraitement())
                .reponseAdmin(r.getReponseAdmin())
                .pieceJointe(r.getPieceJointe())
                .attachmentName(r.getAttachmentName())
                .concoursId(r.getConcoursId())
                .build();
    }

    @Transactional
    public Reclamation changerMetadata(Long reclamationId, Categorie categorie, Priorite priorite) {
        log.info("Manually updating metadata for reclamation {}: Categorie={}, Priorite={}", reclamationId, categorie, priorite);
        Reclamation reclamation = reclamationRepository.findById(reclamationId)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));
        
        if (categorie != null) reclamation.setCategorie(categorie);
        if (priorite != null) reclamation.setPriorite(priorite);
        
        return reclamationRepository.save(reclamation);
    }

    @Transactional
    public Reclamation prendreEnCharge(Long reclamationId) {
        log.info("Taking charge of reclamation ID: {}", reclamationId);
        Reclamation reclamation = reclamationRepository.findById(reclamationId)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée avec l'ID: " + reclamationId));

        if (reclamation.getStatut() != Statut.SOUMISE) {
            throw new IllegalStateException("Seules les réclamations SOUMISES peuvent être prises en charge.");
        }

        reclamation.setStatut(Statut.EN_COURS);
        return reclamationRepository.save(reclamation);
    }

    @Transactional
    public Reclamation cloturerReclamation(Long reclamationId, Statut finalStatut, String reponse) {
        log.info("Closing reclamation ID: {} with status: {}", reclamationId, finalStatut);
        
        if (finalStatut != Statut.CLOTUREE_ACCEPTEE && finalStatut != Statut.CLOTUREE_REJETEE) {
            throw new IllegalArgumentException("Statut de clôture invalide.");
        }

        if (reponse == null || reponse.trim().isEmpty()) {
            throw new IllegalArgumentException("La réponse de l'administrateur est obligatoire pour la clôture.");
        }

        Reclamation reclamation = reclamationRepository.findById(reclamationId)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée avec l'ID: " + reclamationId));

        reclamation.setStatut(finalStatut);
        reclamation.setReponseAdmin(reponse);
        reclamation.setDateTraitement(LocalDateTime.now());

        Reclamation savedReclamation = reclamationRepository.save(reclamation);

        // Notify via RabbitMQ
        publishClotureEvent(savedReclamation);

        return savedReclamation;
    }

    private void publishClotureEvent(Reclamation reclamation) {
        try {
            ReclamationClotureeEvent event = ReclamationClotureeEvent.builder()
                    .reclamationId(reclamation.getId())
                    .candidatId(reclamation.getCandidatId())
                    .concoursId(reclamation.getConcoursId())
                    .objet(reclamation.getObjet())
                    .statut(reclamation.getStatut())
                    .reponseAdmin(reclamation.getReponseAdmin())
                    .dateTraitement(reclamation.getDateTraitement())
                    .build();
            
            rabbitTemplate.convertAndSend("reclamation.exchange", "reclamation.cloturee", event);
            log.info("Published Cloture Event for reclamation {}", reclamation.getId());
        } catch (Exception e) {
            log.error("Failed to publish RabbitMQ event for reclamation {}", reclamation.getId(), e);
        }
    }

    public long countByStatut(Statut statut) {
        return reclamationRepository.countByStatut(statut);
    }

    public long countByStatut(Statut statut, String concoursId) {
        if (concoursId == null || concoursId.isEmpty()) {
            return reclamationRepository.countByStatut(statut);
        }
        return reclamationRepository.findWithFilters(statut, null, null, concoursId).stream()
                .filter(r -> r.getStatut() == statut)
                .count();
    }

    public long countTotal() {
        return reclamationRepository.count();
    }

    public long countTotal(String concoursId) {
        if (concoursId == null || concoursId.isEmpty()) {
            return reclamationRepository.count();
        }
        return reclamationRepository.findWithFilters(null, null, null, concoursId).size();
    }

    public long countByCategorie(Categorie categorie) {
        return reclamationRepository.countByCategorie(categorie);
    }

    public long countByCategorie(Categorie categorie, String concoursId) {
        if (concoursId == null || concoursId.isEmpty()) {
            return reclamationRepository.countByCategorie(categorie);
        }
        return reclamationRepository.findWithFilters(null, null, categorie, concoursId).size();
    }

    public ReclamationDashboardStatsDTO getDashboardStats(String concoursId) {
        log.info("Calculating dashboard stats for concours: {}", concoursId);
        
        List<Statut> activeStatuses = Arrays.asList(Statut.SOUMISE, Statut.EN_COURS);
        List<Statut> resolvedStatuses = Arrays.asList(Statut.CLOTUREE_ACCEPTEE, Statut.CLOTUREE_REJETEE);

        // 1. Total Urgents (tous, pour refléter la présence de réclamations critiques)
        long totalUrgents = reclamationRepository.countByPriorite(Priorite.URGENTE, concoursId);

        // 2. Stats par catégorie
        List<ReclamationDashboardStatsDTO.CategoryStatDTO> categoryStats = new ArrayList<>();
        
        for (Categorie cat : Categorie.values()) {
            long total = countByCategorie(cat, concoursId);
            long critical = reclamationRepository.countByCategorieAndPriorite(cat, Priorite.URGENTE, concoursId);
            long resolved = reclamationRepository.countByCategorieAndStatutIn(cat, resolvedStatuses, concoursId);
            
            int rate = 0;
            if (total > 0) {
                rate = (int) ((resolved * 100) / total);
            }

            categoryStats.add(ReclamationDashboardStatsDTO.CategoryStatDTO.builder()
                    .categoryId(cat.name())
                    .total(total)
                    .critical(critical)
                    .resolvedRate(rate)
                    .build());
        }

        return ReclamationDashboardStatsDTO.builder()
                .totalUrgents(totalUrgents)
                .categories(categoryStats)
                .build();
    }
}
