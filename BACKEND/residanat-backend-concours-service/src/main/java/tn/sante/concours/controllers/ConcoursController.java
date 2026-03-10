package tn.sante.concours.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.sante.concours.dto.ConcoursRequestDTO;
import tn.sante.concours.dto.ConcoursResponseDTO;
import tn.sante.concours.dto.PageResponseDTO;
import tn.sante.concours.models.Etat;
import tn.sante.concours.services.ConcoursService;

import java.util.UUID;

@RestController
@RequestMapping("/api/concours")
@Tag(name = "Gestion des Concours", description = "Endpoints pour créer, modifier, lister, et publier les concours")
public class ConcoursController {

    private final ConcoursService concoursService;

    public ConcoursController(ConcoursService concoursService) {
        this.concoursService = concoursService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un concours", description = "Nécessite le rôle ADMIN", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "201", description = "Concours créé")
    public ResponseEntity<ConcoursResponseDTO> createConcours(@Valid @RequestBody ConcoursRequestDTO requestDTO) {
        return new ResponseEntity<>(concoursService.createConcours(requestDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier un concours", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ConcoursResponseDTO> updateConcours(
            @PathVariable UUID id,
            @Valid @RequestBody ConcoursRequestDTO requestDTO) {
        return ResponseEntity.ok(concoursService.updateConcours(id, requestDTO));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un concours (soft delete)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Void> deleteConcours(@PathVariable UUID id) {
        concoursService.deleteConcours(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un concours par son ID")
    public ResponseEntity<ConcoursResponseDTO> getConcoursById(@PathVariable UUID id) {
        return ResponseEntity.ok(concoursService.getConcoursById(id));
    }

    @GetMapping
    @Operation(summary = "Lister les concours avec filtres et pagination")
    public ResponseEntity<PageResponseDTO<ConcoursResponseDTO>> getConcours(
            @RequestParam(required = false) Integer annee,
            @RequestParam(required = false) String typeConcours,
            @RequestParam(required = false) Etat etat,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(concoursService.getConcours(annee, typeConcours, etat, page, size));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Publier un concours", description = "Passe le statut à PUBLIE", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ConcoursResponseDTO> publishConcours(@PathVariable UUID id) {
        return ResponseEntity.ok(concoursService.publishConcours(id));
    }

    @PatchMapping("/{id}/unpublish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Dépublier un concours", description = "Passe le statut à NON_PUBLIE", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ConcoursResponseDTO> unpublishConcours(@PathVariable UUID id) {
        return ResponseEntity.ok(concoursService.unpublishConcours(id));
    }
}
