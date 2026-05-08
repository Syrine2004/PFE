package tn.sante.resultat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.resultat.model.ResultatCandidat;
import tn.sante.resultat.service.ResultatService;
import java.util.List;

@RestController
@RequestMapping("/api/admin/resultats")
@RequiredArgsConstructor
public class ResultatAdminController {

    private final ResultatService resultatService;

    @PostMapping("/import")
    public ResponseEntity<?> importerFichierExcel(
            @RequestParam("file") MultipartFile file, 
            @RequestParam("concoursId") String concoursId,
            @RequestParam(value = "rectification", defaultValue = "false") boolean rectification) throws java.io.IOException {
        return ResponseEntity.ok(resultatService.importerFichierExcel(file, concoursId, rectification));
    }

    @PostMapping("/publier")
    public ResponseEntity<?> publierResultats(@RequestParam("concoursId") String concoursId) {
        resultatService.publierResultats(concoursId);
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Résultats publiés avec succès et notifications envoyées."
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestParam("concoursId") String concoursId) {
        return ResponseEntity.ok(resultatService.getStats(concoursId));
    }

    @DeleteMapping("/vider")
    public ResponseEntity<?> viderResultats(@RequestParam("concoursId") String concoursId) {
        resultatService.viderResultats(concoursId);
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Tous les résultats du concours ont été supprimés."
        ));
    }

    @GetMapping("/preview")
    public ResponseEntity<?> getPreview(@RequestParam("concoursId") String concoursId) {
        return ResponseEntity.ok(resultatService.getPreview(concoursId));
    }

    @GetMapping("/list")
    public ResponseEntity<?> getList(
            @RequestParam("concoursId") String concoursId,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(resultatService.getPaginatedResults(concoursId, pageable));
    }

    @GetMapping("/stats/histogram")
    public ResponseEntity<java.util.Map<String, Long>> getHistogram(
            @RequestParam(required = false) String concoursId) {
        return ResponseEntity.ok(resultatService.getHistogramStats(concoursId));
    }
}
