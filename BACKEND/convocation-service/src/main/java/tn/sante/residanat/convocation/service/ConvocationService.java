package tn.sante.residanat.convocation.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.sante.residanat.convocation.client.ConcoursClient;
import tn.sante.residanat.convocation.client.UtilisateurClient;
import tn.sante.residanat.convocation.dto.ConcoursDto;
import tn.sante.residanat.convocation.dto.UtilisateurDto;
import tn.sante.residanat.convocation.model.Convocation;
import tn.sante.residanat.convocation.repository.ConvocationRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * Service métier pour la gestion des convocations.
 * Orchestration complète : récupération des données, génération PDF/QR, sauvegarde.
 */
@Service
public class ConvocationService {

    private static final Logger log = LoggerFactory.getLogger(ConvocationService.class);
    private final ConvocationRepository convocationRepository;
    private final UtilisateurClient utilisateurClient;
    private final ConcoursClient concoursClient;

    private static final String STORAGE_PATH = "./stockage/convocations";
    private static final DateTimeFormatter DATE_FORMAT_FR = DateTimeFormatter.ofPattern("EEEE dd MMMM yyyy", Locale.FRENCH);

    @Value("${convocation.verify.base-url:http://localhost:8080/api/convocations/verifier}")
    private String qrCodeVerifyBaseUrl;

    public ConvocationService(ConvocationRepository convocationRepository, 
                            UtilisateurClient utilisateurClient, 
                            ConcoursClient concoursClient) {
        this.convocationRepository = convocationRepository;
        this.utilisateurClient = utilisateurClient;
        this.concoursClient = concoursClient;
    }

    /**
     * Génère une convocation complète pour un candidat.
     * Orchestration du pipeline : récupération données → hash → QR Code → PDF → sauvegarde fichier → sauvegarde BD.
     * 
     * @param dossierId l'ID du dossier de candidature
     * @param candidatId l'ID du candidat (utilisateur)
     * @param concoursId l'ID du concours
     * @return l'entité Convocation sauvegardée en base de données
     * @throws Exception si erreur d'aucune sorte (réseau, génération, I/O, etc.)
     */
    public Convocation genererConvocation(Long dossierId, Long candidatId, UUID concoursId) 
            throws Exception {
        
        log.info("Génération d'une nouvelle convocation pour le dossier {} et le candidat {}", dossierId, candidatId);

        // ============================================================
        // Récupération des données utilisateur - RÉSILIENCE AUX ERREURS
        // ============================================================
        UtilisateurDto utilisateur;
        try {
            utilisateur = utilisateurClient.getUtilisateurById(candidatId);
            log.info("✅ Utilisateur récupéré via Feign : {}", utilisateur.getNom());
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'utilisateur {} via Feign, utilisation des données de TEST", candidatId, e);
            utilisateur = creerUtilisateurMock(candidatId);
        }

        // ============================================================
        // Récupération des données concours - RÉSILIENCE AUX ERREURS
        // ============================================================
        ConcoursDto concours;
        try {
            concours = concoursClient.getConcoursById(concoursId);
            log.info("✅ Concours récupéré via Feign : {}", concours.getLibelle());
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer le concours {} via Feign, utilisation des données de TEST", concoursId, e);
            concours = creerConcoursMock(concoursId);
        }

        String hashSecurise = UUID.randomUUID().toString();

        // Données d'épreuve (Mocks pour la démo / PFE)
        String numInscriptions = "2026-RES-" + String.format("%04d", dossierId);
        String salle = "Amphithéâtre Ibn El Jazzar";
        String place = String.valueOf(100 + dossierId % 200);
        LocalDateTime dateEpreuve = concours.getDateDebut() != null ? concours.getDateDebut() : LocalDateTime.of(2026, 12, 19, 8, 0);
        String heureAppel = "07H30";
        String lieuExamen = determinerLieuExamen(utilisateur, concours);

        String qrCodeContent = buildVerificationUrl(hashSecurise);
        byte[] qrCodeImage = genererQRCode(qrCodeContent);

        // Création de l'entité avec les nouvelles infos
        Convocation convocation = new Convocation();
        convocation.setDossierId(dossierId);
        convocation.setCandidatId(candidatId);
        convocation.setConcoursId(concoursId.toString());  // Conversion UUID → String
        convocation.setHashSecurise(hashSecurise);
        convocation.setNumeroInscription(numInscriptions);
        convocation.setSalle(salle);
        convocation.setPlace(place);
        convocation.setDateEpreuve(dateEpreuve);
        convocation.setHeureAppel(heureAppel);
        convocation.setLieuExamenDetail(lieuExamen);

        // Génération du PDF avec toutes les données
        byte[] pdfBytes = genererPDF(utilisateur, convocation, concours.getLibelle(), qrCodeImage);

        Path dossierStockage = Paths.get(STORAGE_PATH);
        Files.createDirectories(dossierStockage);

        String nomFichier = "convocation_" + hashSecurise + ".pdf";
        Path cheminFichier = dossierStockage.resolve(nomFichier);
        Files.write(cheminFichier, pdfBytes);

        convocation.setCheminFichierPdf(cheminFichier.toAbsolutePath().toString());
        convocation.setStatut(Convocation.StatutConvocation.GENEREE);
        convocation.setNombreTelechargements(0);
        convocation.setDateExpiration(LocalDateTime.now().plusDays(30));

        return convocationRepository.save(convocation);
    }

    /**
     * Complète une convocation existante si des champs sont absents et regénère le PDF/QR.
     */
    public Convocation rafraichirConvocation(Convocation convocation) throws Exception {
        if (convocation == null) {
            return null;
        }

        UtilisateurDto utilisateur;
        try {
            utilisateur = utilisateurClient.getUtilisateurById(convocation.getCandidatId());
        } catch (Exception e) {
            log.warn("Impossible de récupérer l'utilisateur {} pendant rafraîchissement, fallback mock", convocation.getCandidatId(), e);
            utilisateur = creerUtilisateurMock(convocation.getCandidatId());
        }

        ConcoursDto concours;
        try {
            concours = concoursClient.getConcoursById(UUID.fromString(convocation.getConcoursId()));
        } catch (Exception e) {
            log.warn("Impossible de récupérer le concours {} pendant rafraîchissement, fallback mock", convocation.getConcoursId(), e);
            concours = creerConcoursMock(UUID.fromString(convocation.getConcoursId()));
        }

        if (convocation.getDateEpreuve() == null) {
            convocation.setDateEpreuve(concours.getDateDebut() != null ? concours.getDateDebut() : LocalDateTime.of(2026, 12, 19, 8, 0));
        }
        if (isBlank(convocation.getHeureAppel())) {
            convocation.setHeureAppel("07H30");
        }
        if (isBlank(convocation.getNumeroInscription())) {
            convocation.setNumeroInscription("2026-RES-" + String.format("%04d", convocation.getDossierId()));
        }
        if (isBlank(convocation.getSalle())) {
            convocation.setSalle("Amphithéâtre Ibn El Jazzar");
        }
        if (isBlank(convocation.getPlace())) {
            convocation.setPlace(String.valueOf(100 + convocation.getDossierId() % 200));
        }

        // Règle métier demandée: l'affectation doit suivre la faculté du diplôme quand disponible.
        convocation.setLieuExamenDetail(determinerLieuExamen(utilisateur, concours));

        String qrCodeContent = buildVerificationUrl(convocation.getHashSecurise());
        byte[] qrCodeImage = genererQRCode(qrCodeContent);
        byte[] pdfBytes = genererPDF(utilisateur, convocation, concours.getLibelle(), qrCodeImage);

        Path dossierStockage = Paths.get(STORAGE_PATH);
        Files.createDirectories(dossierStockage);

        Path cheminFichier;
        if (isBlank(convocation.getCheminFichierPdf())) {
            cheminFichier = dossierStockage.resolve("convocation_" + convocation.getHashSecurise() + ".pdf");
            convocation.setCheminFichierPdf(cheminFichier.toAbsolutePath().toString());
        } else {
            cheminFichier = Paths.get(convocation.getCheminFichierPdf());
        }

        Files.write(cheminFichier, pdfBytes);
        return convocationRepository.save(convocation);
    }

    /**
     * Génère un QR Code au format PNG transformé en tableau d'octets.
     * Encode une chaîne (URL + hash sécurisé) dans un QR Code 300x300 pixels.
     * 
     * @param contenu le contenu à encoder (URL complète avec hash)
     * @return le tableau d'octets représentant l'image PNG du QR Code
     * @throws WriterException si erreur lors de l'encodage ZXing
     * @throws IOException si erreur lors de la conversion en bytes
     */
    private byte[] genererQRCode(String contenu) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        
        // Encode le contenu en QR Code (format bitmatrix 300x300)
        var bitMatrix = qrCodeWriter.encode(contenu, BarcodeFormat.QR_CODE, 300, 300);
        
    // Convertit la matrice en image PNG et retourne les bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
        
        return baos.toByteArray();
    }

    /**
     * Génère une image PNG du QR Code de vérification à partir du hash sécurisé.
     */
    public byte[] genererQrCodePourHash(String hashSecurise) throws Exception {
        String qrCodeContent = buildVerificationUrl(hashSecurise);
        return genererQRCode(qrCodeContent);
    }

    /**
     * Génère l'image PNG du QR code pour un hash spécifique.
     * Utilisé pour afficher le vrai QR code sur le frontend.
     */
    public byte[] genererImageQrCode(String hashSecurise) throws Exception {
        String qrCodeContent = buildVerificationUrl(hashSecurise);
        return genererQRCode(qrCodeContent);
    }

    /**
     * Génère un contenu PDF en texte structuré contenant :
     * - En-tête officiel
     * - Titre principal
     * - Bloc d'informations du candidat
     * - Bloc d'informations du concours
     * 
     * @param utilisateur les données du candidat
     * @param concours les données du concours
     * @param qrCodeImage l'image du QR Code en bytes
     * @return le tableau d'octets contenant le contenu PDF texte
     * @throws IOException si erreur lors de l'écriture
     */
    private byte[] genererPDF(UtilisateurDto utilisateur, Convocation conv, String libelleConcours, byte[] qrCodeImage) 
            throws Exception {
        // Nouvelles couleurs pour correspondre au design gris/bleu
        DeviceRgb navy = new DeviceRgb(31, 42, 68);      // #1f2a44
        DeviceRgb navySoft = new DeviceRgb(74, 85, 111);  // #4a556f
        DeviceRgb paperFill = new DeviceRgb(245, 245, 245); // #f5f5f5 (Gris Sidebar)
        DeviceRgb paperEdge = new DeviceRgb(224, 228, 232); // #e0e4e8
        DeviceRgb greyText = new DeviceRgb(128, 128, 128);
        DeviceRgb stamp = new DeviceRgb(0, 0, 0);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);
        document.setMargins(24, 24, 24, 24);

        // Bandeau officiel
        // Suppression du rectangle noir du haut (bandeau déco)
        // document.add(new Div().setHeight(6).setBackgroundColor(stamp)...);

        // En-tête institutionnel avec la disposition demandée
        int sessionYear = conv.getDateEpreuve() != null ? conv.getDateEpreuve().getYear() : LocalDateTime.now().getYear();
        Table mastheadTable = new Table(UnitValue.createPercentArray(new float[]{36, 22, 42})).useAllAvailableWidth();
        mastheadTable.setMarginBottom(6);

        String dateHeader = (conv.getLieuExamenDetail() != null ? conv.getLieuExamenDetail() : "Tunis") 
                          + ", le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH));

        Cell leftDateCell = new Cell()
            .add(new Paragraph(dateHeader).setFontSize(8).setBold().setFontColor(navy))
            .setTextAlignment(TextAlignment.LEFT)
            .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.BOTTOM)
            .setBorder(Border.NO_BORDER)
            .setPaddingTop(26);
        mastheadTable.addCell(leftDateCell);

        Cell centerSealCell = new Cell().setBorder(Border.NO_BORDER);
        try {
            // Tentative de chargement via le classpath (Jar)
            var resource = getClass().getResource("/tunisie-logo.png");
            Image logoImg = null;
            if (resource != null) {
                try {
                    logoImg = new Image(ImageDataFactory.create(resource));
                } catch (Exception e) {
                    log.warn("ImageDataFactory a échoué pour la ressource classpath");
                }
            }
            
            if (logoImg == null) {
                // Fallback : recherche directe dans le dossier de travail (Docker)
                try {
                    logoImg = new Image(ImageDataFactory.create("/app/resources/tunisie-logo.png"));
                } catch (Exception e) {
                    log.warn("ImageDataFactory a échoué pour le fallback /app/resources");
                }
            }

            if (logoImg != null) {
                logoImg.scaleToFit(55, 55).setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
                centerSealCell.add(logoImg);
            } else {
                centerSealCell.add(new Paragraph("RÉPUBLIQUE TUNISIENNE").setFontSize(8).setBold());
            }
        } catch (Exception e) {
            log.error("❌ Échec critique du chargement du logo : {}", e.getMessage());
            centerSealCell.add(new Paragraph("RÉPUBLIQUE TUNISIENNE").setFontSize(8).setBold());
        }
        centerSealCell.setTextAlignment(TextAlignment.CENTER)
            .setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
        mastheadTable.addCell(centerSealCell);

        Div rightBlock = new Div().setTextAlignment(TextAlignment.RIGHT);
        rightBlock.add(new Paragraph("RÉPUBLIQUE TUNISIENNE").setBold().setFontSize(9).setFontColor(navy));
        rightBlock.add(new Paragraph("MINISTÈRE DE LA SANTÉ").setBold().setFontSize(8).setFontColor(navy));
        rightBlock.add(new Paragraph("DIRECTION DES CONCOURS MÉDICAUX").setBold().setFontSize(8).setFontColor(navy));
        
        String lieu = conv.getLieuExamenDetail() != null ? conv.getLieuExamenDetail().toUpperCase() : "TUNIS";
        rightBlock.add(new Paragraph("FACULTÉ : " + lieu)
            .setBold()
            .setFontSize(8)
            .setFontColor(navy)
            .setMarginTop(2));
            
        rightBlock.add(new Paragraph("SESSION " + sessionYear)
            .setBold()
            .setFontSize(8)
            .setFontColor(navy)
            .setMarginTop(2));
        Cell rightCell = new Cell().add(rightBlock).setBorder(Border.NO_BORDER);
        mastheadTable.addCell(rightCell);

        document.add(mastheadTable);

        document.add(new Paragraph("CONVOCATION AU CONCOURS DE RÉSIDANAT EN MÉDECINE")
            .setTextAlignment(TextAlignment.CENTER)
            .setBold()
            .setFontColor(navy)
            .setFontSize(14)
            .setMarginTop(12)
            .setMarginBottom(10));

        Table metaTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        metaTable.setBackgroundColor(paperFill).setBorder(new SolidBorder(paperEdge, 1));
        metaTable.addCell(new Cell().add(new Paragraph("Référence : " + conv.getNumeroInscription()).setFontSize(9).setFontColor(navy).setBold()).setBorder(Border.NO_BORDER));
        metaTable.addCell(new Cell().add(new Paragraph("Statut : Générée").setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setFontColor(navySoft)).setBorder(Border.NO_BORDER));
        document.add(metaTable);

        document.add(new Paragraph("Informations du candidat")
            .setFontSize(10)
            .setFontColor(navySoft)
            .setBold()
            .setMarginTop(10)
            .setMarginBottom(4));
        Table candidatTable = new Table(UnitValue.createPercentArray(new float[]{34, 66})).useAllAvailableWidth();
        addInfoRow(candidatTable, "Identité", (utilisateur.getPrenom() + " " + utilisateur.getNom()).trim(), paperFill, paperEdge, navy, navySoft, false);
        addInfoRow(candidatTable, "N° CIN", utilisateur.getCin(), paperFill, paperEdge, navy, navySoft, false);
        addInfoRow(candidatTable, "N° Inscription", conv.getNumeroInscription(), paperFill, paperEdge, navy, navySoft, true);
        document.add(candidatTable);

        document.add(new Paragraph("Informations de l'épreuve")
            .setFontSize(10)
            .setFontColor(navySoft)
            .setBold()
            .setMarginTop(10)
            .setMarginBottom(4));
        Table epreuveTable = new Table(UnitValue.createPercentArray(new float[]{34, 66})).useAllAvailableWidth();
        addInfoRow(epreuveTable, "Date de l'épreuve", formatDateEpreuve(conv.getDateEpreuve()), paperFill, paperEdge, navy, navySoft, false);
        addInfoRow(epreuveTable, "Heure d'appel", conv.getHeureAppel(), paperFill, paperEdge, navy, navySoft, false);
        addInfoRow(epreuveTable, "Centre d'examen", conv.getLieuExamenDetail(), paperFill, paperEdge, navy, navySoft, false);
        addInfoRow(epreuveTable, "Salle / Place", conv.getSalle() + " / N° " + conv.getPlace(), paperFill, paperEdge, navy, navySoft, true);
        document.add(epreuveTable);

        Div consignesBox = new Div()
            .setBorder(new SolidBorder(paperEdge, 1))
            .setBackgroundColor(new DeviceRgb(248, 248, 248))
            .setPadding(10)
            .setMarginTop(10);
        consignesBox.add(new Paragraph("Consignes importantes")
            .setBold()
            .setFontSize(10)
            .setFontColor(navySoft)
            .setMarginBottom(4));
        com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
            .setFontSize(9)
            .setFontColor(navy)
            .add(new ListItem("Présentation de la carte d'identité nationale obligatoire."))
            .add(new ListItem("Téléphone portable et objets connectés interdits en salle."))
            .add(new ListItem("Tout retard après l'heure d'appel entraîne l'exclusion de l'épreuve."));
        consignesBox.add(list);
        document.add(consignesBox);

        Table footerTable = new Table(UnitValue.createPercentArray(new float[]{58, 42})).useAllAvailableWidth();
        Cell signatureCell = new Cell().setTextAlignment(TextAlignment.LEFT).setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.TOP);
        signatureCell.add(new Paragraph("Cachet et signature de l'administration")
                .setBold()
                .setFontSize(8)
                .setFontColor(navy));
        signatureCell.add(new Paragraph("\n\n.........................................................................")
                .setFontSize(8)
                .setFontColor(navySoft));
        signatureCell.setBorder(Border.NO_BORDER);
        footerTable.addCell(signatureCell);

        Cell qrCell = new Cell().setTextAlignment(TextAlignment.CENTER).setBorder(Border.NO_BORDER);
        Image qrImg = new Image(ImageDataFactory.create(qrCodeImage)).setWidth(75).setHeight(75);
        qrImg.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
        qrCell.add(qrImg);
        
        // Label sur deux lignes, bien centré
        qrCell.add(new Paragraph("VÉRIFICATION\nEN LIGNE")
                .setBold()
                .setFontSize(7)
                .setFixedLeading(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(navy)
                .setMarginTop(3));
                

        footerTable.addCell(qrCell);
        
        document.add(footerTable.setMarginTop(15));

        document.close();
        return baos.toByteArray();
    }

        private void addInfoRow(Table table,
                    String label,
                    String value,
                    DeviceRgb labelBackground,
                    DeviceRgb borderColor,
                    DeviceRgb valueColor,
                    DeviceRgb labelColor,
                    boolean emphasized) {
        table.addCell(new Cell()
            .add(new Paragraph(label).setBold().setFontSize(9).setFontColor(labelColor))
            .setBackgroundColor(labelBackground)
            .setBorder(new SolidBorder(borderColor, 1))
            .setPadding(7));
        Paragraph valueParagraph = new Paragraph(value != null ? value : "N/A")
            .setFontSize(9)
            .setFontColor(emphasized ? new DeviceRgb(0, 0, 0) : valueColor)
            .setBold();
        table.addCell(new Cell()
            .add(valueParagraph)
            .setBorder(new SolidBorder(borderColor, 1))
            .setPadding(7));
    }

    private String formatDateEpreuve(LocalDateTime dateEpreuve) {
        if (dateEpreuve == null) {
            return "N/A";
        }
        return DATE_FORMAT_FR.format(dateEpreuve).toUpperCase(Locale.ROOT);
    }

    private String determinerLieuExamen(UtilisateurDto utilisateur, ConcoursDto concours) {
        if (utilisateur != null && !isBlank(utilisateur.getFaculte())) {
            // Afficher exactement la faculté saisie par l'utilisateur
            return utilisateur.getFaculte().trim();
        }
        if (concours != null && !isBlank(concours.getLieuExamen())) {
            return concours.getLieuExamen();
        }
        return "Faculté de Médecine de Tunis (FMT)";
    }

    private String buildVerificationUrl(String hashSecurise) {
        String base = qrCodeVerifyBaseUrl == null ? "" : qrCodeVerifyBaseUrl.trim();
        if (base.endsWith("/")) {
            return base + hashSecurise;
        }
        return base + "/" + hashSecurise;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * Crée un objet UtilisateurDto avec des données de test.
     * Utilisé en fallback si l'appel Feign au auth-service échoue.
     * 
     * @param candidatId l'ID du candidat
     * @return un UtilisateurDto avec des données fictives
     */
    private UtilisateurDto creerUtilisateurMock(Long candidatId) {
        log.info("🧪 Création d'un UtilisateurDto MOCK pour candidatId={}", candidatId);
        UtilisateurDto mock = new UtilisateurDto();
        mock.setId(candidatId);
        mock.setNom("Boulabiar");
        mock.setPrenom("Syrine");
        mock.setCin("15354368");
        mock.setEmail("syrineboulabiar@gmail.com");
        return mock;
    }

    /**
     * Crée un objet ConcoursDto avec des données de test.
     * Utilisé en fallback si l'appel Feign au concours-service échoue.
     * 
     * @param concoursId l'ID du concours
     * @return un ConcoursDto avec des données fictives
     */
    private ConcoursDto creerConcoursMock(UUID concoursId) {
        log.info("🧪 Création d'un ConcoursDto MOCK pour concoursId={}", concoursId);
        ConcoursDto mock = new ConcoursDto();
        mock.setId(concoursId);  // UUID reste UUID ici pour le DTO
        mock.setLibelle("Concours Résidanat Blanc");
        mock.setDateDebut(LocalDateTime.now().plusDays(15));
        mock.setLieuExamen("FMT Tunis");
        return mock;
    }
}
