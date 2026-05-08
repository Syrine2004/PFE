package tn.sante.reclamation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sante.reclamation.entity.Reclamation;
import tn.sante.reclamation.service.ReclamationCandidateService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reclamations")
@RequiredArgsConstructor
public class CandidatReclamationController {

    private final ReclamationCandidateService reclamationCandidateService;

    @GetMapping("/my")
    public ResponseEntity<List<Reclamation>> getMyReclamations(@RequestParam(required = false) String concoursId) {
        return ResponseEntity.ok(reclamationCandidateService.getMyReclamations(concoursId));
    }

    @PostMapping
    public ResponseEntity<Reclamation> submitReclamation(@RequestBody Map<String, String> payload) {
        String objet = payload.get("objet");
        String description = payload.get("description");
        String pieceJointe = payload.get("pieceJointe");
        String attachmentName = payload.get("attachmentName");
        String concoursId = payload.get("concoursId");
        
        if (objet == null || objet.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(reclamationCandidateService.submitReclamation(objet, description, pieceJointe, attachmentName, concoursId));
    }
}
