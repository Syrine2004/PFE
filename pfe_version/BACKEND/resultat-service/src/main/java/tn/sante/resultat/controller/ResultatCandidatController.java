package tn.sante.resultat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.sante.resultat.service.ResultatService;
import tn.sante.resultat.repository.ResultatCandidatRepository;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import java.util.Optional;
import tn.sante.resultat.model.ResultatCandidat;

@RestController
@RequestMapping("/api/candidat/resultats")
@RequiredArgsConstructor
public class ResultatCandidatController {

    private final ResultatService resultatService;
    private final ResultatCandidatRepository repository;

    @GetMapping("/mes-resultats/{candidatId}")
    public ResponseEntity<?> consulterResultat(@PathVariable Long candidatId) {
        try {
            var resultatDto = resultatService.consulterResultat(candidatId, null);
            return ResponseEntity.ok(resultatDto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{candidatId}/concours/{concoursId}")
    public ResponseEntity<?> consulterResultatParConcours(@PathVariable Long candidatId, @PathVariable String concoursId) {
        try {
            var resultatDto = resultatService.consulterResultat(candidatId, concoursId);
            return ResponseEntity.ok(resultatDto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/est-publie/{concoursId}")
    public ResponseEntity<Boolean> isResultatsPublies(@PathVariable String concoursId) {
        return ResponseEntity.ok(resultatService.isPublie(concoursId));
    }

    @GetMapping("/telecharger-pdf/{candidatId}")
    public ResponseEntity<byte[]> telechargerPdf(@PathVariable Long candidatId, 
                                               @RequestParam(required = false) String concoursId) {
        try {
            byte[] pdfContent = resultatService.genererResultatPdf(candidatId, concoursId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"releve_notes.pdf\"")
                    .body(pdfContent);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Endpoint pour récupérer l'image PNG du QR Code.
     */
    @GetMapping(value = "/qr/{hash}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> obtenirQrCode(@PathVariable String hash) {
        try {
            byte[] qrImage = resultatService.genererImageQrCode(hash);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
                    .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                    .body(qrImage);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Vérification en ligne via QR Code (retourne le PDF en affichage inline).
     */
    @GetMapping("/verifier/{hash}")
    public ResponseEntity<byte[]> verifierResultat(@PathVariable String hash) {
        try {
            Optional<ResultatCandidat> res = repository.findByHashSecurise(hash);
            if (res.isEmpty()) return ResponseEntity.notFound().build();
            
            byte[] pdfContent = resultatService.genererResultatPdf(res.get().getCandidatId(), res.get().getConcoursId());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"releve_notes_officiel.pdf\"")
                    .body(pdfContent);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    private boolean isEligibilityFailure(Throwable throwable) {
        return false; 
    }
}
