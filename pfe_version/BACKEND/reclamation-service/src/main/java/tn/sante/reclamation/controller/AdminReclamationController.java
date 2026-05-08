package tn.sante.reclamation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sante.reclamation.dto.EnrichedReclamationDTO;
import tn.sante.reclamation.dto.ReclamationDashboardStatsDTO;
import tn.sante.reclamation.entity.Categorie;
import tn.sante.reclamation.entity.Priorite;
import tn.sante.reclamation.entity.Reclamation;
import tn.sante.reclamation.entity.Statut;
import tn.sante.reclamation.service.ReclamationAdminService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reclamations")
@RequiredArgsConstructor
public class AdminReclamationController {

    private final ReclamationAdminService reclamationAdminService;

    @GetMapping
    public ResponseEntity<List<EnrichedReclamationDTO>> getReclamations(
            @RequestParam(required = false) Statut statut,
            @RequestParam(required = false) Priorite priorite,
            @RequestParam(required = false) Categorie categorie,
            @RequestParam(required = false) String concoursId) {
        return ResponseEntity.ok(reclamationAdminService.getReclamationsEnrichies(statut, priorite, categorie, concoursId));
    }

    @PutMapping("/{id}/metadata")
    public ResponseEntity<Reclamation> updateMetadata(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        
        Categorie cat = payload.get("categorie") != null ? Categorie.valueOf(payload.get("categorie")) : null;
        Priorite prio = payload.get("priorite") != null ? Priorite.valueOf(payload.get("priorite")) : null;
        
        return ResponseEntity.ok(reclamationAdminService.changerMetadata(id, cat, prio));
    }

    @PutMapping("/{id}/prendre-en-charge")
    public ResponseEntity<Reclamation> prendreEnCharge(@PathVariable Long id) {
        return ResponseEntity.ok(reclamationAdminService.prendreEnCharge(id));
    }

    @PutMapping("/{id}/cloturer")
    public ResponseEntity<Reclamation> cloturer(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        
        Statut finalStatut = Statut.valueOf((String) payload.get("statut"));
        String reponse = (String) payload.get("reponse");
        
        return ResponseEntity.ok(reclamationAdminService.cloturerReclamation(id, finalStatut, reponse));
    }

    @GetMapping("/stats/counts-by-status")
    public ResponseEntity<Map<String, Long>> getStats(
            @RequestParam(required = false) String concoursId) {
        Map<String, Long> stats = new java.util.HashMap<>();
        stats.put("total", reclamationAdminService.countTotal(concoursId));
        stats.put("soumise", reclamationAdminService.countByStatut(Statut.SOUMISE, concoursId));
        stats.put("en_cours", reclamationAdminService.countByStatut(Statut.EN_COURS, concoursId));
        stats.put("acceptee", reclamationAdminService.countByStatut(Statut.CLOTUREE_ACCEPTEE, concoursId));
        stats.put("rejetee", reclamationAdminService.countByStatut(Statut.CLOTUREE_REJETEE, concoursId));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/categories")
    public ResponseEntity<Map<String, Long>> getCategoriesStats(
            @RequestParam(required = false) String concoursId) {
        Map<String, Long> stats = new java.util.HashMap<>();
        for (Categorie cat : Categorie.values()) {
            stats.put(cat.name(), reclamationAdminService.countByCategorie(cat, concoursId));
        }
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/dashboard")
    public ResponseEntity<ReclamationDashboardStatsDTO> getDashboardStats(
            @RequestParam(required = false) String concoursId) {
        return ResponseEntity.ok(reclamationAdminService.getDashboardStats(concoursId));
    }
}
