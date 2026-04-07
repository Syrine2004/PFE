package tn.sante.residanat_backend.Dossier_Candidature_service.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.DossierCandidature;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.Document;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.StatutDossier;
import tn.sante.residanat_backend.Dossier_Candidature_service.models.TypeDocument;
import tn.sante.residanat_backend.Dossier_Candidature_service.services.DossierCandidatureService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dossiers")
@RequiredArgsConstructor
public class DossierCandidatureController {

    private final DossierCandidatureService dossierService;

    @PostMapping("/init")
    public ResponseEntity<DossierCandidature> initDossier(@RequestParam Long candidatId,
            @RequestParam UUID concoursId) {
        return ResponseEntity.ok(dossierService.createOrGetDossier(candidatId, concoursId));
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<Document> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") TypeDocument type) {
        return ResponseEntity.ok(dossierService.uploadDocument(id, file, type));
    }

    @GetMapping
    public ResponseEntity<List<DossierCandidature>> getAllDossiers() {
        return ResponseEntity.ok(dossierService.getAllDossiers());
    }

    @GetMapping("/search")
    public ResponseEntity<DossierCandidature> getDossierByCandidat(
            @RequestParam Long candidatId,
            @RequestParam UUID concoursId) {
        return ResponseEntity.ok(dossierService.getDossierByCandidat(candidatId, concoursId).orElse(null));
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<DossierCandidature> getDossier(@PathVariable Long id) {
        return ResponseEntity.ok(dossierService.getDossierById(id));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<DossierCandidature> updateStatut(
            @PathVariable Long id,
            @RequestParam StatutDossier statut) {
        return ResponseEntity.ok(dossierService.updateStatut(id, statut));
    }

    @PostMapping("/{id}/check-ia")
    public ResponseEntity<Void> triggerIA(@PathVariable Long id, @RequestBody java.util.Map<String, Object> data) {
        dossierService.triggerIAAnalysis(id, data);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/update-candidat-info")
    public ResponseEntity<Void> updateCandidatInfo(@PathVariable Long id, @RequestBody java.util.Map<String, Object> data) {
        dossierService.updateCandidatInfo(id, data);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/date-diplome")
    public ResponseEntity<DossierCandidature> updateDateDiplome(
            @PathVariable Long id,
            @RequestParam String dateDiplome) {
        return ResponseEntity.ok(dossierService.updateDateDiplome(id, dateDiplome));
    }
}
