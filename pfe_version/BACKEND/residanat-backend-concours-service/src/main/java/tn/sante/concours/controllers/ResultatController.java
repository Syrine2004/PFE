package tn.sante.concours.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.concours.dto.ResultatCandidatDto;
import tn.sante.concours.services.ResultatService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/concours/{concoursId}/resultats")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ResultatController {

    private final ResultatService resultatService;

    @Autowired
    public ResultatController(ResultatService resultatService) {
        this.resultatService = resultatService;
    }

    @PostMapping("/import")
    // @PreAuthorize("hasRole('ADMIN')") // Décommentez si la sécurité rbac est en place
    public ResponseEntity<List<ResultatCandidatDto>> uploadResultats(@PathVariable UUID concoursId,
                                                                     @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
        
        List<ResultatCandidatDto> resultats = resultatService.importerResultats(file, concoursId);
        return ResponseEntity.ok(resultats);
    }

    @PostMapping("/publish")
    // @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> publishResultats(@PathVariable UUID concoursId) {
        resultatService.publierResultats(concoursId);
        return ResponseEntity.ok("Résultats publiés avec succès et notification envoyée.");
    }

    @GetMapping
    public ResponseEntity<List<ResultatCandidatDto>> getAllResultats(@PathVariable UUID concoursId) {
        return ResponseEntity.ok(resultatService.getResultatsByConcours(concoursId));
    }

    // Identifiant peut être le CIN ou le numéro de convocation
    @GetMapping("/candidat/{identifiant}")
    public ResponseEntity<ResultatCandidatDto> getResultatCandidat(@PathVariable UUID concoursId,
                                                                   @PathVariable String identifiant) {
        ResultatCandidatDto resultatDto = resultatService.getResultatByCinOuConvocation(concoursId, identifiant);
        return ResponseEntity.ok(resultatDto);
    }
}
