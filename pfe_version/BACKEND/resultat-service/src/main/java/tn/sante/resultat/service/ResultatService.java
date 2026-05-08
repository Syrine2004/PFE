package tn.sante.resultat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.resultat.dto.ResultatCandidatDto;
import tn.sante.resultat.event.ResultatsPubliesEvent;
import tn.sante.resultat.model.ImportResultatTrace;
import tn.sante.resultat.model.ResultatCandidat;
import tn.sante.resultat.repository.ImportResultatTraceRepository;
import tn.sante.resultat.repository.ResultatCandidatRepository;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.io.image.ImageDataFactory;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;
import java.util.Optional;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultatService {

    private final ResultatCandidatRepository resultatRepository;
    private final ImportResultatTraceRepository traceRepository;
    private final tn.sante.resultat.repository.PublicationConcoursRepository publicationRepository;
    private final RabbitTemplate rabbitTemplate;
    private final tn.sante.resultat.client.AuthClient authClient;
    
    // RabbitMQ topic/queue binding values
    private static final String EXCHANGE_NAME = "concours.exchange";
    private static final String ROUTING_KEY_RESULTATS = "concours.resultats.publies";

    private static final java.nio.file.Path IMPORT_STORAGE_DIR = java.nio.file.Paths.get("./stockage/imports");

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            java.nio.file.Files.createDirectories(IMPORT_STORAGE_DIR);
        } catch (java.io.IOException e) {
            log.error("Impossible de créer le dossier de stockage des imports : {}", e.getMessage());
        }
    }

    /**
     * Vérifie si les résultats d'un concours sont publiés.
     */
    public boolean isPublie(String concoursId) {
        return publicationRepository.findById(concoursId)
                .map(tn.sante.resultat.model.PublicationConcours::isPublie)
                .orElse(false);
    }

    /**
     * Importe un fichier Excel et sauvegarde les résultats.
     */
    @Transactional
    public Map<String, Object> importerFichierExcel(MultipartFile file, String concoursId, boolean rectification) throws IOException {
        List<ResultatCandidat> resultats = new ArrayList<>();
        String fileName = file.getOriginalFilename();

        // --- Sauvegarde physique du fichier (similaire au module affectation) ---
        String safeConcours = concoursId.replaceAll("[^a-zA-Z0-9-]", "_");
        String finalFileName = safeConcours + "__" + System.currentTimeMillis() + "__" + fileName;
        java.nio.file.Path targetPath = IMPORT_STORAGE_DIR.resolve(finalFileName);
        java.nio.file.Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        List<String[]> rows = new ArrayList<>();
        boolean isCsv = fileName != null && fileName.toLowerCase().endsWith(".csv");

        if (isCsv) {
            try (BufferedReader br = java.nio.file.Files.newBufferedReader(targetPath)) {
                String line;
                while ((line = br.readLine()) != null) {
                    String[] cells = line.split(",");
                    rows.add(cells);
                }
            }
        } else {
            try (InputStream is = java.nio.file.Files.newInputStream(targetPath); Workbook workbook = new XSSFWorkbook(is)) {
                Sheet sheet = workbook.getSheetAt(0);
                for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    String[] cells = new String[8];
                    for (int j = 0; j < 8; j++) {
                        cells[j] = parseString(row.getCell(j));
                    }
                    rows.add(cells);
                }
            }
        }

        for (int i = 1; i < rows.size(); i++) {
            String[] cells = rows.get(i);
            if (cells.length < 8) continue;

            String numeroConvocation = cells[0];
            String cin = cells[1];
            String nomPrenom = cells[2];
            Double noteEpreuve1 = parseDoubleFromString(cells[3]);
            Double noteEpreuve2 = parseDoubleFromString(cells[4]);
            Double moyenneGenerale = parseDoubleFromString(cells[5]);
            Integer rang = parseIntegerFromString(cells[6]);
            String statut = cells[7];

                // --- RETOUR SMART UPDATE : On cherche s'il existe déjà ---
                ResultatCandidat resultat = resultatRepository.findFirstByCinAndConcoursId(cin, concoursId)
                        .orElse(new ResultatCandidat());
                
                // Matching candidatId si nouveau
                if (resultat.getId() == null) {
                    try {
                        Long candidatId = authClient.getCandidatIdByCin(cin);
                        resultat.setCandidatId(candidatId);
                    } catch(Exception e) {
                        log.warn("Matching candidat échoué pour CIN: {}", cin);
                    }
                }

                resultat.setNumeroConvocation(numeroConvocation);
                resultat.setCin(cin);
                resultat.setConcoursId(concoursId);
                resultat.setNomPrenom(nomPrenom);
                resultat.setNoteEpreuve1(noteEpreuve1);
                resultat.setNoteEpreuve2(noteEpreuve2);
                resultat.setMoyenneGenerale(moyenneGenerale);
                resultat.setRang(rang);
                resultat.setStatut(statut);
                
                // Générer un hash pour le QR Code s'il n'existe pas encore
                if (resultat.getHashSecurise() == null) {
                    resultat.setHashSecurise(UUID.randomUUID().toString());
                }

                resultats.add(resultat);
            }

            List<ResultatCandidat> saved = resultatRepository.saveAll(resultats);

            ImportResultatTrace trace = ImportResultatTrace.builder()
                    .fileName(fileName)
                    .importedAt(LocalDateTime.now())
                    .importedCount(saved.size())
                    .concoursId(concoursId)
                    .importedBy("ADMIN")
                    .build();
            traceRepository.save(trace);

            // Toujours verrouiller la publication lors d'un nouvel import complet
            if (!rectification) {
                tn.sante.resultat.model.PublicationConcours resetPub = tn.sante.resultat.model.PublicationConcours.builder()
                        .concoursId(concoursId)
                        .publie(false)
                        .build();
                publicationRepository.save(resetPub);
            }

            return Map.of(
                "message", "Importation réussie (" + saved.size() + " lignes)",
                "count", saved.size()
            );
        }

    /**
     * Récupère les statistiques d'importation pour un concours.
     */
    public tn.sante.resultat.dto.ImportStatsResponse getStats(String concoursId) {
        long totalResults = resultatRepository.countByConcoursId(concoursId);
        List<ImportResultatTrace> traces = traceRepository.findByConcoursIdOrderByImportedAtDesc(concoursId);
        
        tn.sante.resultat.dto.ImportStatsResponse.LatestImportDetails latest = null;
        if (!traces.isEmpty()) {
            ImportResultatTrace lastTrace = traces.get(0);
            latest = tn.sante.resultat.dto.ImportStatsResponse.LatestImportDetails.builder()
                    .fileName(lastTrace.getFileName())
                    .importedAt(lastTrace.getImportedAt())
                    .importedCount(lastTrace.getImportedCount())
                    .concoursId(lastTrace.getConcoursId())
                    .build();
        }

        return tn.sante.resultat.dto.ImportStatsResponse.builder()
                .totalResults(totalResults)
                .totalImports(traces.size())
                .latestImport(latest)
                .build();
    }

    /**
     * Récupère un aperçu des données importées.
     */
    public tn.sante.resultat.dto.ExcelPreviewResponse getPreview(String concoursId) {
        List<ResultatCandidat> results = resultatRepository.findByConcoursId(concoursId);
        // Limiter à 20 pour l'aperçu
        List<ResultatCandidat> previewList = results.stream().limit(20).toList();

        List<String> headers = List.of("Convocation", "CIN", "Nom & Prénom", "Note 1", "Note 2", "Moyenne", "Rang", "Statut");
        List<List<String>> rows = previewList.stream().map(r -> List.of(
            r.getNumeroConvocation() != null ? r.getNumeroConvocation() : "",
            r.getCin() != null ? r.getCin() : "",
            r.getNomPrenom() != null ? r.getNomPrenom() : "",
            r.getNoteEpreuve1() != null ? r.getNoteEpreuve1().toString() : "",
            r.getNoteEpreuve2() != null ? r.getNoteEpreuve2().toString() : "",
            r.getMoyenneGenerale() != null ? r.getMoyenneGenerale().toString() : "",
            r.getRang() != null ? r.getRang().toString() : "",
            r.getStatut() != null ? r.getStatut() : ""
        )).toList();

        return tn.sante.resultat.dto.ExcelPreviewResponse.builder()
                .fileName("Aperçu des résultats")
                .headers(headers)
                .rows(rows)
                .build();
    }

    /**
     * Valide et publie officiellement les résultats du concours.
     */
    public void publierResultats(String concoursId) {
        log.info("Publication officielle des résultats pour le concours {}", concoursId);
        
        // 1. Enregistrement de l'état de publication
        tn.sante.resultat.model.PublicationConcours publication = tn.sante.resultat.model.PublicationConcours.builder()
                .concoursId(concoursId)
                .publie(true)
                .build();
        publicationRepository.save(publication);

        // 2. Publication de l'événement RabbitMQ pour le Notification-Service
        ResultatsPubliesEvent genericEvent = ResultatsPubliesEvent.builder()
                .concoursId(concoursId)
                .message("Les résultats du concours ont été publiés. Vous pouvez consulter votre relevé.")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitTemplate.convertAndSend(EXCHANGE_NAME, ROUTING_KEY_RESULTATS, genericEvent);
        
        // 3. Notification individuelle pour chaque candidat
        List<ResultatCandidat> resultats = resultatRepository.findByConcoursId(concoursId);
        for (ResultatCandidat resultat : resultats) {
            tn.sante.resultat.event.ResultatCandidatPublieEvent indEvent = tn.sante.resultat.event.ResultatCandidatPublieEvent.builder()
                    .candidatId(resultat.getCandidatId())
                    .concoursId(concoursId)
                    .statut(resultat.getStatut())
                    .timestamp(LocalDateTime.now())
                    .build();
            // On utilise la même routing key ou une routing key spécifique
            rabbitTemplate.convertAndSend(EXCHANGE_NAME, "concours.resultats.candidat.publie", indEvent);
        }
        
        log.info("Événement RabbitMQ ResultatsPubliesEvent envoyé ainsi que les events individuels pour {} candidats", resultats.size());
    }

    /**
     * Récupère le résultat pour un candidat spécifique dans un concours spécifique
     */
    public ResultatCandidatDto consulterResultat(Long candidatId, String concoursId) {
        ResultatCandidat resultat = (concoursId != null) 
                ? resultatRepository.findByCandidatIdAndConcoursId(candidatId, concoursId)
                    .orElseThrow(() -> new RuntimeException("Résultat non trouvé pour ce concours"))
                : resultatRepository.findByCandidatId(candidatId)
                    .orElseThrow(() -> new RuntimeException("Résultat non trouvé pour le candidat"));
        
        // Vérification si les résultats sont publiés pour ce concours
        boolean estPublie = publicationRepository.findById(resultat.getConcoursId())
                .map(tn.sante.resultat.model.PublicationConcours::isPublie)
                .orElse(false);
        
        if (!estPublie) {
            throw new RuntimeException("Les résultats ne sont pas encore publiés pour ce concours.");
        }

        return mapToDto(resultat);
    }

    /**
     * Génère un bulletin de notes PDF pour un candidat dans un concours spécifique.
     */
    public byte[] genererResultatPdf(Long candidatId, String concoursId) throws IOException {
        ResultatCandidat r = (concoursId != null)
                ? resultatRepository.findByCandidatIdAndConcoursId(candidatId, concoursId)
                    .orElseThrow(() -> new RuntimeException("Résultat introuvable pour ce concours"))
                : resultatRepository.findByCandidatId(candidatId)
                    .orElseThrow(() -> new RuntimeException("Résultat introuvable"));

        boolean estPublie = publicationRepository.findById(r.getConcoursId())
                .map(tn.sante.resultat.model.PublicationConcours::isPublie)
                .orElse(false);
        
        if (!estPublie) {
            throw new RuntimeException("Le bulletin n'est pas encore disponible au téléchargement.");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);
        document.setMargins(30, 40, 30, 40); // Réduction des marges haut/bas

        // Couleurs
        DeviceRgb navy = new DeviceRgb(30, 41, 59);
        DeviceRgb muted = new DeviceRgb(100, 116, 139);
        DeviceRgb successGreen = new DeviceRgb(5, 150, 105);
        DeviceRgb dangerRed = new DeviceRgb(220, 38, 38);

        // 1. EN-TÊTE 3 COLONNES
        Table header = new Table(UnitValue.createPercentArray(new float[]{33, 34, 33})).useAllAvailableWidth();
        header.setBorder(Border.NO_BORDER).setMarginBottom(20);

        // Gauche
        header.addCell(new Cell().add(new Paragraph("RÉPUBLIQUE TUNISIENNE\nMINISTÈRE DE LA SANTÉ")
                .setBold().setFontSize(8).setFontColor(navy))
                .setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.LEFT));

        // Milieu : Petit Drapeau (as8ir barcha)
        Cell flagCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
        try {
            InputStream is = getClass().getResourceAsStream("/images/tunisie-flag.png");
            if (is != null) {
                Image logo = new Image(ImageDataFactory.create(is.readAllBytes()));
                logo.scaleToFit(32, 32); 
                logo.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER); // Centrage explicite
                flagCell.add(logo);
            }
        } catch (Exception e) { /* fallback */ }
        header.addCell(flagCell);

        // Droite
        String session = LocalDateTime.now().getYear() + "/" + (LocalDateTime.now().getYear() + 1);
        header.addCell(new Cell().add(new Paragraph("CONCOURS NATIONAL\nSESSION " + session)
                .setBold().setFontSize(8).setFontColor(navy))
                .setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT));

        document.add(header);

        // 2. TITRE (Plus petit)
        document.add(new Paragraph("RELEVÉ DE NOTES INDIVIDUEL")
                .setTextAlignment(TextAlignment.CENTER)
                .setBold().setFontSize(14).setFontColor(navy)
                .setMarginBottom(5));
        document.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(1.2f)).setMarginBottom(25).setFontColor(navy));

        // 3. IDENTITÉ DU CANDIDAT
        document.add(new Paragraph("IDENTITÉ DU CANDIDAT").setBold().setFontSize(9).setFontColor(navy).setMarginBottom(10));
        
        Table idTable = new Table(UnitValue.createPercentArray(new float[]{30, 70})).useAllAvailableWidth();
        idTable.setBorder(Border.NO_BORDER).setMarginBottom(25);

        addIdRowClassic(idTable, "Nom & Prénom", r.getNomPrenom(), navy, muted);
        addIdRowClassic(idTable, "Identifiant (CIN)", r.getCin(), navy, muted);
        addIdRowClassic(idTable, "N° Convocation", r.getNumeroConvocation(), navy, muted);
        
        document.add(idTable);

        // 4. SCORES DE L'ÉVALUATION
        document.add(new Paragraph("SCORES DE L'ÉVALUATION").setBold().setFontSize(9).setFontColor(navy).setMarginBottom(10));
        
        Table gradesTable = new Table(UnitValue.createPercentArray(new float[]{75, 25})).useAllAvailableWidth();
        gradesTable.addHeaderCell(new Cell().add(new Paragraph("ÉPREUVE").setBold().setFontSize(8)).setBackgroundColor(new DeviceRgb(245, 245, 245)));
        gradesTable.addHeaderCell(new Cell().add(new Paragraph("NOTE (/20)").setBold().setFontSize(8)).setBackgroundColor(new DeviceRgb(245, 245, 245)).setTextAlignment(TextAlignment.RIGHT));

        addGradeRowClassic(gradesTable, "Épreuve n°1 : Théorique", r.getNoteEpreuve1(), navy);
        addGradeRowClassic(gradesTable, "Épreuve n°2 : Pratique", r.getNoteEpreuve2(), navy);
        
        document.add(gradesTable);

        // 5. MOYENNE GÉNÉRALE
        boolean admitted = r.getStatut() != null && (r.getStatut().toLowerCase().contains("admit") || r.getStatut().toLowerCase().contains("admis"));
        DeviceRgb statusColor = admitted ? successGreen : dangerRed;

        Table avgTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        avgTable.setMarginTop(20).setMarginBottom(40);
        
        avgTable.addCell(new Cell().add(new Paragraph("MOYENNE GÉNÉRALE").setBold().setFontSize(12).setFontColor(navy))
                .setBorder(Border.NO_BORDER).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE));
        avgTable.addCell(new Cell().add(new Paragraph(String.format("%.3f", r.getMoyenneGenerale()))
                .setBold().setFontSize(20).setFontColor(statusColor))
                .setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT));
        
        document.add(avgTable);

        // 6. DÉCISION DU JURY
        document.add(new Paragraph("DÉCISION DU JURY").setBold().setFontSize(10).setFontColor(navy).setTextAlignment(TextAlignment.CENTER).setMarginBottom(8));
        document.add(new Paragraph(r.getStatut() != null ? r.getStatut().toUpperCase() : "-")
                .setBold().setFontSize(22).setFontColor(statusColor).setTextAlignment(TextAlignment.CENTER).setMarginBottom(8));

        if (admitted && r.getRang() != null) {
            document.add(new Paragraph("RANG AU CONCOURS : n° " + r.getRang())
                    .setBold().setFontSize(12).setFontColor(navy).setTextAlignment(TextAlignment.CENTER));
        }

        // 7. FOOTER WITH QR CODE
        Table footerTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        footerTable.setMarginTop(30);

        try {
            byte[] qrImage = genererImageQrCode(r.getHashSecurise());
            Image qrImg = new Image(ImageDataFactory.create(qrImage)).setWidth(65).setHeight(65);
            qrImg.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
            
            Cell qrCell = new Cell().add(qrImg).setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER);
            qrCell.add(new Paragraph("VÉRIFICATION EN LIGNE")
                    .setBold().setFontSize(7).setFontColor(navy).setMarginTop(3));
            
            footerTable.addCell(qrCell);
        } catch (Exception e) {
            log.error("Erreur lors de l'ajout du QR Code au PDF", e);
        }

        document.add(footerTable);

        document.add(new Paragraph("\nDocument officiel délivré par la Direction des Concours Médicaux.")
                .setFontSize(7).setFontColor(muted)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(20));

        document.close();
        return baos.toByteArray();
    }

    private void addIdRowClassic(Table table, String label, String value, DeviceRgb valColor, DeviceRgb labelColor) {
        table.addCell(new Cell().add(new Paragraph(label).setFontSize(9).setFontColor(labelColor)).setBorder(Border.NO_BORDER).setPaddingBottom(6));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "-").setBold().setFontSize(9).setFontColor(valColor)).setBorder(Border.NO_BORDER).setPaddingBottom(6));
    }

    private void addGradeRowClassic(Table table, String label, Double value, DeviceRgb textColor) {
        table.addCell(new Cell().add(new Paragraph(label).setFontSize(9).setFontColor(textColor)).setPadding(8));
        table.addCell(new Cell().add(new Paragraph(value != null ? String.format("%.2f", value) : "-").setBold().setFontSize(9).setFontColor(textColor)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
    }

    // --- Helpers de parsing Excel ---

    private Double parseDoubleFromString(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        try {
            return Double.parseDouble(s.replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseIntegerFromString(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Double parseDouble(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
            return cell.getNumericCellValue();
        } else if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
            return Double.parseDouble(cell.getStringCellValue().replace(",", "."));
        }
        return null;
    }

    private Integer parseInteger(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        } else if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
            return Integer.parseInt(cell.getStringCellValue());
        }
        return null;
    }

    private String parseString(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
            return String.valueOf((long) cell.getNumericCellValue());
        } else if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
            return cell.getStringCellValue();
        }
        return cell.toString();
    }

    private ResultatCandidatDto mapToDto(ResultatCandidat r) {
        return ResultatCandidatDto.builder()
                .id(r.getId())
                .candidatId(r.getCandidatId())
                .concoursId(r.getConcoursId())
                .numeroConvocation(r.getNumeroConvocation())
                .cin(r.getCin())
                .nomPrenom(r.getNomPrenom())
                .noteEpreuve1(r.getNoteEpreuve1())
                .noteEpreuve2(r.getNoteEpreuve2())
                .moyenneGenerale(r.getMoyenneGenerale())
                .rang(r.getRang())
                .statut(r.getStatut())
                .hashSecurise(r.getHashSecurise())
                .build();
    }
    
    /**
     * Génère l'image PNG du QR code pour un hash spécifique.
     */
    public byte[] genererImageQrCode(String hashSecurise) throws Exception {
        String verificationUrl = buildVerificationUrl(hashSecurise);
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        var bitMatrix = qrCodeWriter.encode(verificationUrl, BarcodeFormat.QR_CODE, 300, 300);
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
        return baos.toByteArray();
    }

    private String buildVerificationUrl(String hashSecurise) {
        String base = qrCodeVerifyBaseUrl == null ? "" : qrCodeVerifyBaseUrl.trim();
        if (base.endsWith("/")) {
            return base + hashSecurise;
        }
        return base + "/" + hashSecurise;
    }
    
    /**
     * Récupère la liste complète des résultats d'un concours avec pagination.
     */
    public org.springframework.data.domain.Page<ResultatCandidat> getPaginatedResults(String concoursId, org.springframework.data.domain.Pageable pageable) {
        return resultatRepository.findByConcoursId(concoursId, pageable);
    }

    /**
     * Supprime tous les résultats d'un concours.
     */
    @Transactional
    public void viderResultats(String concoursId) {
        log.info("Suppression manuelle de tous les résultats et traces pour le concours: {}", concoursId);
        resultatRepository.deleteByConcoursId(concoursId);
        traceRepository.deleteByConcoursId(concoursId);
        publicationRepository.deleteById(concoursId); // Réinitialiser l'état de publication

        // --- Suppression physique des fichiers (similaire au module affectation) ---
        try {
            String safeConcours = concoursId.replaceAll("[^a-zA-Z0-9-]", "_");
            try (java.nio.file.DirectoryStream<java.nio.file.Path> stream = java.nio.file.Files.newDirectoryStream(IMPORT_STORAGE_DIR, safeConcours + "__*")) {
                for (java.nio.file.Path file : stream) {
                    java.nio.file.Files.deleteIfExists(file);
                }
            }
        } catch (java.io.IOException e) {
            log.warn("⚠️ Erreur lors de la suppression physique des fichiers d'import resultats: {}", e.getMessage());
        }
    }

    public Map<String, Long> getHistogramStats(String concoursId) {
        log.info("📊 Calcul des statistiques de l'histogramme pour le concoursId: [{}]", concoursId);
        if (concoursId == null || concoursId.isBlank()) {
            log.warn("⚠️ Aucun concoursId fourni, récupération des statistiques globales.");
            List<ResultatCandidat> allResults = resultatRepository.findAll();
            long lt10 = 0, b10_12 = 0, b12_14 = 0, b14_16 = 0, b16_18 = 0, gt18 = 0;
            for (ResultatCandidat r : allResults) {
                Double score = r.getMoyenneGenerale();
                if (score == null) continue;
                if (score < 10) lt10++;
                else if (score < 12) b10_12++;
                else if (score < 14) b12_14++;
                else if (score < 16) b14_16++;
                else if (score < 18) b16_18++;
                else gt18++;
            }
            return Map.of("< 10", lt10, "10-12", b10_12, "12-14", b12_14, "14-16", b14_16, "16-18", b16_18, "> 18", gt18);
        }

        return Map.of(
            "< 10", resultatRepository.countByConcoursIdAndMoyenneGeneraleLessThan(concoursId, 10.0),
            "10-12", resultatRepository.countByConcoursIdAndMoyenneGeneraleGreaterThanEqualAndMoyenneGeneraleLessThan(concoursId, 10.0, 12.0),
            "12-14", resultatRepository.countByConcoursIdAndMoyenneGeneraleGreaterThanEqualAndMoyenneGeneraleLessThan(concoursId, 12.0, 14.0),
            "14-16", resultatRepository.countByConcoursIdAndMoyenneGeneraleGreaterThanEqualAndMoyenneGeneraleLessThan(concoursId, 14.0, 16.0),
            "16-18", resultatRepository.countByConcoursIdAndMoyenneGeneraleGreaterThanEqualAndMoyenneGeneraleLessThan(concoursId, 16.0, 18.0),
            "> 18", resultatRepository.countByConcoursIdAndMoyenneGeneraleGreaterThanEqual(concoursId, 18.0)
        );
    }

    /**
     * Gère la suppression automatique des résultats quand un concours est supprimé.
     */
    @RabbitListener(queues = tn.sante.resultat.config.RabbitMQConfig.QUEUE_CONCOURS_DELETED)
    @Transactional
    public void handleConcoursDeleted(java.util.Map<String, Object> event) {
        String cidStr = (String) event.get("concoursId");
        if (cidStr != null) {
            log.info("♻️ Nettoyage automatique des résultats pour le concours supprimé: {}", cidStr);
            this.viderResultats(cidStr);
        }
    }
}
