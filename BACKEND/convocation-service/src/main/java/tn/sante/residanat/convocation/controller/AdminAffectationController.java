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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.residanat.convocation.repository.AffectationCandidatRepository;
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
@CrossOrigin(origins = "*") // À affiner si nécessaire
public class AdminAffectationController {

    private static final Path IMPORT_STORAGE_DIR = Paths.get("./stockage/imports");

    private final ExcelImportService excelImportService;
    private final AffectationCandidatRepository affectationCandidatRepository;

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("concoursId") String concoursId,
            @RequestParam(value = "forceReimport", defaultValue = "false") boolean forceReimport,
            @RequestParam(value = "correctionNote", required = false) String correctionNote) {
        Map<String, Object> response = new HashMap<>();
        try {
            long existingCount = affectationCandidatRepository.countByConcoursId(concoursId);

            if (existingCount > 0 && !forceReimport) {
                response.put("message", "Import déjà effectué pour ce concours. Réimport autorisé uniquement en mode correction ministérielle.");
                response.put("concoursId", concoursId);
                response.put("existingCount", existingCount);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            int count = excelImportService.importerAffectations(file, concoursId, forceReimport);
            saveLatestImportFile(file, concoursId);
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

    @GetMapping("/imports/trace")
    public ResponseEntity<List<Map<String, Object>>> getImportTraces(
            @RequestParam(value = "concoursId", required = false) String concoursId) {
        return ResponseEntity.ok(Collections.emptyList());
    }

    @GetMapping("/imports/stats")
    public ResponseEntity<Map<String, Object>> getImportStats(
            @RequestParam(value = "concoursId", required = false) String concoursId) {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> latestImport = findLatestImportMetadata(concoursId);

        response.put("totalAffectations", (concoursId != null && !concoursId.isBlank())
                ? affectationCandidatRepository.countByConcoursId(concoursId)
                : affectationCandidatRepository.count());
        response.put("totalImports", latestImport == null ? 0 : 1);
        response.put("latestImport", latestImport);
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

    private void saveLatestImportFile(MultipartFile file, String concoursId) throws Exception {
        if (file == null || file.isEmpty()) {
            return;
        }
        Files.createDirectories(IMPORT_STORAGE_DIR);

        String safeConcours = sanitizeConcoursId(concoursId);
        String extension = extractExtension(file.getOriginalFilename());

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(IMPORT_STORAGE_DIR, safeConcours + "__latest.*")) {
            for (Path existing : stream) {
                Files.deleteIfExists(existing);
            }
        }

        Path target = IMPORT_STORAGE_DIR.resolve(safeConcours + "__latest" + extension);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    }

    private Path findLatestImportFilePath(String concoursId) throws Exception {
        String safeConcours = sanitizeConcoursId(concoursId);
        if (!Files.exists(IMPORT_STORAGE_DIR)) {
            return null;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(IMPORT_STORAGE_DIR, safeConcours + "__latest.*")) {
            for (Path file : stream) {
                return file;
            }
        }
        return null;
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

            Map<String, Object> latest = new HashMap<>();
            latest.put("fileName", filePath.getFileName().toString());
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
}
