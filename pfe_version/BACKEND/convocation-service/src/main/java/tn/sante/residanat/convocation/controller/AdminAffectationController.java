package tn.sante.residanat.convocation.controller;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Async;
import lombok.extern.slf4j.Slf4j;
import tn.sante.residanat.convocation.client.UtilisateurClient;
import tn.sante.residanat.convocation.event.ConvocationReadyEvent;
import tn.sante.residanat.convocation.model.AffectationCandidat;
import tn.sante.residanat.convocation.repository.AffectationCandidatRepository;
import tn.sante.residanat.convocation.service.ConvocationService;
import tn.sante.residanat.convocation.service.ExcelImportService;

import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/convocations/admin/affectations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AdminAffectationController {

    private static final Path IMPORT_STORAGE_DIR = Paths.get("./stockage/imports");

    private final ExcelImportService excelImportService;
    private final ConvocationService convocationService;
    private final AffectationCandidatRepository affectationCandidatRepository;
    private final tn.sante.residanat.convocation.repository.ImportAffectationTraceRepository traceRepository;
    private final RabbitTemplate rabbitTemplate;
    private final UtilisateurClient utilisateurClient;

    @PostMapping("/import")
    @Transactional
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("concoursId") String concoursId,
            @RequestParam(value = "forceReimport", defaultValue = "false") boolean forceReimport,
            @RequestParam(value = "correctionNote", required = false) String correctionNote) {
        log.info("📥 Importation demandée pour concoursId: {}, forceReimport: {}", concoursId, forceReimport);
        Map<String, Object> response = new HashMap<>();
        try {
            // On ne bloque plus si déjà existant, on autorise l'append/update (Smart Update)
            int count = excelImportService.importerAffectations(file, concoursId, forceReimport);
            
            // Sauvegarder le fichier physique (on garde tous les fichiers maintenant)
            String savedFileName = saveLatestImportFile(file, concoursId);
            
            // Créer une trace en base
            tn.sante.residanat.convocation.model.ImportAffectationTrace trace = tn.sante.residanat.convocation.model.ImportAffectationTrace.builder()
                    .fileName(savedFileName)
                    .name(file.getOriginalFilename())
                    .importedAt(java.time.LocalDateTime.now())
                    .importedCount(count)
                    .concoursId(concoursId)
                    .importedBy("ADMIN")
                    .build();
            traceRepository.save(trace);

            response.put("message", "Importation réussie");
            response.put("count", count);
            response.put("concoursId", concoursId);
            response.put("forceReimport", forceReimport);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("message", "Import refusé");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("message", "Erreur lors de l'importation");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/clear")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearAffectations(@RequestParam("concoursId") String concoursId) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 1. Supprimer de la base de données (affectations + traces + convocations)
            affectationCandidatRepository.deleteByConcoursId(concoursId);
            traceRepository.deleteByConcoursId(concoursId);
            convocationService.viderConvocations(concoursId);

            // 2. Supprimer les fichiers physiques du stockage des imports
            String safeConcours = sanitizeConcoursId(concoursId);
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(IMPORT_STORAGE_DIR, safeConcours + "__*")) {
                for (Path file : stream) {
                    Files.deleteIfExists(file);
                }
            }

            response.put("message", "Données, traces, convocations et fichiers supprimés pour le concours " + concoursId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "Erreur lors de la suppression");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/publish")
    @Transactional
    public ResponseEntity<Map<String, Object>> publishAffectations(@RequestParam("concoursId") String concoursId) {
        Map<String, Object> response = new HashMap<>();
        try {
            affectationCandidatRepository.updatePublieByConcoursId(concoursId, true);
            
            // Génération en masse des convocations pour les dossiers déjà validés
            convocationService.genererConvocationsPourConcours(java.util.UUID.fromString(concoursId));

            // Notification proactive des candidats en arrière-plan
            notifyCandidates(concoursId);
            
            response.put("message", "Les affectations ont été diffusées avec succès pour le concours " + concoursId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "Erreur lors de la diffusion");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/imports/trace")
    public ResponseEntity<List<tn.sante.residanat.convocation.model.ImportAffectationTrace>> getImportTraces(
            @RequestParam(value = "concoursId", required = false) String concoursId) {
        if (concoursId == null || concoursId.isBlank()) {
            return ResponseEntity.ok(traceRepository.findAll());
        }
        return ResponseEntity.ok(traceRepository.findByConcoursIdOrderByImportedAtDesc(concoursId));
    }

    @GetMapping("/list")
    public ResponseEntity<org.springframework.data.domain.Page<AffectationCandidat>> getAffectationsList(
            @RequestParam("concoursId") String concoursId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(affectationCandidatRepository.findByConcoursId(concoursId, org.springframework.data.domain.PageRequest.of(page, size)));
    }

    @GetMapping("/imports/stats")
    public ResponseEntity<Map<String, Object>> getImportStats(
            @RequestParam(value = "concoursId", required = false) String concoursId) {
        Map<String, Object> response = new HashMap<>();
        
        List<tn.sante.residanat.convocation.model.ImportAffectationTrace> traces = (concoursId != null && !concoursId.isBlank())
                ? traceRepository.findByConcoursIdOrderByImportedAtDesc(concoursId)
                : traceRepository.findAll();

        tn.sante.residanat.convocation.model.ImportAffectationTrace latest = traces.isEmpty() ? null : traces.get(0);

        long total = (concoursId != null && !concoursId.isBlank())
                ? affectationCandidatRepository.countByConcoursId(concoursId)
                : affectationCandidatRepository.count();

        log.info("📊 Stats demandées pour concoursId: {}. Total affectations trouvées: {}, Total imports: {}", 
                concoursId, total, traces.size());

        response.put("totalAffectations", total);
        response.put("totalImports", traces.size());
        response.put("latestImport", latest);
        response.put("concoursId", concoursId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/imports/latest-file")
    public ResponseEntity<byte[]> downloadLatestImportedFile(@RequestParam("concoursId") String concoursId) {
        try {
            if (concoursId == null || concoursId.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            Path filePath = findLatestImportFilePath(concoursId);
            if (filePath == null || !Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] content = Files.readAllBytes(filePath);
            String originalFileName = filePath.getFileName().toString();
            String contentType = resolveExcelContentType(filePath.getFileName().toString());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + (originalFileName == null ? "ministere_import.xlsx" : originalFileName) + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/imports/latest-preview")
    public ResponseEntity<Map<String, Object>> previewLatestImportedFile(@RequestParam("concoursId") String concoursId) {
        try {
            if (concoursId == null || concoursId.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            Path filePath = findLatestImportFilePath(concoursId);
            if (filePath == null || !Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> preview = buildExcelPreview(filePath);
            preview.put("fileName", filePath.getFileName().toString());
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String saveLatestImportFile(MultipartFile file, String concoursId) throws Exception {
        if (file == null || file.isEmpty()) {
            return null;
        }
        Files.createDirectories(IMPORT_STORAGE_DIR);

        String safeConcours = sanitizeConcoursId(concoursId);
        String originalFileName = file.getOriginalFilename();
        String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        // On ne nettoie plus les anciens fichiers, on les garde tous
        // On ajoute un timestamp pour éviter les collisions et garder l'historique
        String savedFileName = safeConcours + "__" + timestamp + "__" + originalFileName;
        Path target = IMPORT_STORAGE_DIR.resolve(savedFileName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        
        return savedFileName;
    }

    private Path findLatestImportFilePath(String concoursId) throws Exception {
        String safeConcours = sanitizeConcoursId(concoursId);
        if (!Files.exists(IMPORT_STORAGE_DIR)) {
            return null;
        }
        
        Path latest = null;
        long lastMod = 0;
        
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(IMPORT_STORAGE_DIR, safeConcours + "__*")) {
            for (Path file : stream) {
                long mod = Files.getLastModifiedTime(file).toMillis();
                if (mod > lastMod) {
                    lastMod = mod;
                    latest = file;
                }
            }
        }
        return latest;
    }

    private String sanitizeConcoursId(String concoursId) {
        return concoursId == null ? "unknown-concours" : concoursId.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractExtension(String fileName) {
        if (fileName == null) {
            return ".xlsx";
        }
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".xls")) {
            return ".xls";
        }
        return ".xlsx";
    }

    private String resolveExcelContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".xls")) {
            return "application/vnd.ms-excel";
        }
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    private Map<String, Object> findLatestImportMetadata(String concoursId) {
        try {
            Path filePath = findLatestImportFilePath(concoursId);
            if (filePath == null || !Files.exists(filePath)) {
                return null;
            }

            String fullFileName = filePath.getFileName().toString();
            // Nettoyage pour l'affichage : on retire "ID__"
            String displayName = fullFileName.contains("__") ? fullFileName.substring(fullFileName.indexOf("__") + 2) : fullFileName;

            Map<String, Object> latest = new HashMap<>();
            latest.put("fileName", displayName);
            latest.put("importedAt", Instant.ofEpochMilli(Files.getLastModifiedTime(filePath).toMillis()).toString());
            latest.put("importedCount", affectationCandidatRepository.countByConcoursId(concoursId));
            latest.put("concoursId", concoursId);
            return latest;
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> buildExcelPreview(Path filePath) throws Exception {
        Map<String, Object> response = new HashMap<>();
        List<String> headers = new ArrayList<>();
        List<List<String>> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(Files.newInputStream(filePath))) {
            Sheet sheet = workbook.getSheetAt(0);
            response.put("sheetName", sheet.getSheetName());

            Row headerRow = sheet.getRow(0);
            int maxCols = headerRow == null ? 0 : Math.max(0, headerRow.getLastCellNum());
            for (int c = 0; c < maxCols; c++) {
                headers.add(formatter.formatCellValue(headerRow.getCell(c)));
            }

            int previewLimit = 200;
            for (int r = 1; r <= sheet.getLastRowNum() && rows.size() < previewLimit; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row, maxCols, formatter)) {
                    continue;
                }
                List<String> values = new ArrayList<>();
                for (int c = 0; c < maxCols; c++) {
                    values.add(formatter.formatCellValue(row.getCell(c)));
                }
                rows.add(values);
            }
        }

        response.put("headers", headers);
        response.put("rows", rows);
        return response;
    }

    private boolean isRowEmpty(Row row, int maxCols, DataFormatter formatter) {
        for (int c = 0; c < maxCols; c++) {
            String value = formatter.formatCellValue(row.getCell(c));
            if (value != null && !value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    @Async
    public void notifyCandidates(String concoursId) {
        log.info("📢 Début de la notification proactive des candidats pour le concours : {}", concoursId);
        try {
            java.util.List<AffectationCandidat> affectations = affectationCandidatRepository.findAll()
                .stream()
                .filter(a -> concoursId.equals(a.getConcoursId()))
                .toList();

            log.info("🔍 {} affectations trouvées pour le concours {}.", affectations.size(), concoursId);

            int notifiedCount = 0;
            for (AffectationCandidat aff : affectations) {
                try {
                    // Récupérer le candidatId à partir du CIN
                    Long candidatId = utilisateurClient.getCandidatIdByCin(aff.getCin());
                    if (candidatId != null) {
                        // Envoyer l'événement de notification
                        rabbitTemplate.convertAndSend(
                            "dossier.exchange",
                            "convocation.ready",
                            new ConvocationReadyEvent(null, candidatId, concoursId, null)
                        );
                        notifiedCount++;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Impossible de notifier le candidat CIN={} : {}", aff.getCin(), e.getMessage());
                }
            }
            log.info("✅ Notification terminée : {} candidats notifiés.", notifiedCount);
        } catch (Exception e) {
            log.error("❌ Erreur lors du processus de notification proactive", e);
        }
    }
}
