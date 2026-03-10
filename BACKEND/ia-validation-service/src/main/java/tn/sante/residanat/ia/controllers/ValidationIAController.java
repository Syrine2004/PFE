package tn.sante.residanat.ia.controllers;

import org.springframework.web.bind.annotation.*;
import tn.sante.residanat.ia.services.ValidationDocumentaireIAService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ia")
public class ValidationIAController {

    private final ValidationDocumentaireIAService iaService;

    public ValidationIAController(ValidationDocumentaireIAService iaService) {
        this.iaService = iaService;
    }

    @PostMapping("/analyse")
    public Map<String, Object> analyserDocument(@RequestBody Map<String, Object> request) {
        return iaService.analyserDocument(request);
    }
}
