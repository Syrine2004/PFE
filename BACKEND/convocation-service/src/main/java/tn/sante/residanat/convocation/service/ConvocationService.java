package tn.sante.residanat.convocation.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
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
    private static final String QR_CODE_URL_BASE = "https://api.residanat.tn/verify/convocation/";

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
        String lieuExamen = concours.getLieuExamen() != null ? concours.getLieuExamen() : "Faculté de Médecine de Tunis (FMT)";

        String qrCodeContent = QR_CODE_URL_BASE + hashSecurise;
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
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);
        document.setMargins(20, 20, 20, 20);

        // --- EN-TÊTE ---
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{30, 40, 30})).useAllAvailableWidth();
        headerTable.addCell(new Cell().add(new Paragraph("RÉPUBLIQUE TUNISIENNE\nMINISTÈRE DE LA SANTÉ").setBold().setFontSize(10)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        headerTable.addCell(new Cell().add(new Paragraph("MINISTÈRE DE LA SANTÉ").setTextAlignment(TextAlignment.CENTER).setBold().setFontSize(12)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        headerTable.addCell(new Cell().add(new Paragraph("Session 2026").setTextAlignment(TextAlignment.RIGHT).setBold()).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        document.add(headerTable);

        document.add(new Paragraph("\n"));

        // --- TITRE ---
        document.add(new Paragraph("CONVOCATION AU CONCOURS DE RÉSIDANAT EN MÉDECINE")
                .setTextAlignment(TextAlignment.CENTER)
                .setBold()
                .setFontSize(16)
                .setMarginBottom(20));

        // --- TABLEAU DES DONNÉES CANDIDAT ---
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{30, 70})).useAllAvailableWidth();
        
        addInfoRow(infoTable, "Nom:", utilisateur.getNom());
        addInfoRow(infoTable, "Prénom:", utilisateur.getPrenom());
        addInfoRow(infoTable, "N° CIN:", utilisateur.getCin());
        addInfoRow(infoTable, "N° Inscription:", conv.getNumeroInscription());
        addInfoRow(infoTable, "Date épreuve:", "SAMEDI 19 DÉCEMBRE 2026");
        addInfoRow(infoTable, "Heure d'appel:", conv.getHeureAppel());
        addInfoRow(infoTable, "Lieu d'examen:", conv.getLieuExamenDetail());
        addInfoRow(infoTable, "Salle:", conv.getSalle());
        addInfoRow(infoTable, "Place:", conv.getPlace());

        document.add(infoTable);

        document.add(new Paragraph("\n"));

        // --- CONSIGNES ---
        Div consignesBox = new Div()
                .setBorder(new com.itextpdf.layout.borders.SolidBorder(1))
                .setBackgroundColor(ColorConstants.LIGHT_GRAY, 0.2f)
                .setPadding(10);
        consignesBox.add(new Paragraph("Consignes Importantes").setBold().setTextAlignment(TextAlignment.CENTER));
        com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
                .add(new ListItem("Présentation CIN obligatoire."))
                .add(new ListItem("Téléphone portable interdit."))
                .add(new ListItem("Respect des horaires d'appel."))
                .add(new ListItem("Tout retard entraîne l'exclusion de l'épreuve."));
        consignesBox.add(list);
        document.add(consignesBox);

        document.add(new Paragraph("\n"));

        // --- SIGNATURE ET QR CODE ---
        Table footerTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        
        Cell signatureCell = new Cell().add(new Paragraph("Signature administrative\n« Pour raison officielle »").setItalic().setFontSize(9));
        // On pourrait ajouter une image de signature ici si dispo
        footerTable.addCell(signatureCell.setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

        Cell qrCell = new Cell().setTextAlignment(TextAlignment.RIGHT);
        qrCell.add(new Paragraph("CODE DE VÉRIFICATION SÉCURISÉ").setFontSize(8).setBold());
        Image qrImage = new Image(ImageDataFactory.create(qrCodeImage)).setWidth(80).setHeight(80);
        qrCell.add(qrImage);
        qrCell.add(new Paragraph("Hash: #" + conv.getHashSecurise().substring(0, 8)).setFontSize(7));
        footerTable.addCell(qrCell.setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

        document.add(footerTable);

        document.close();
        return baos.toByteArray();
    }

    private void addInfoRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold()).setBackgroundColor(ColorConstants.WHITE));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "N/A")));
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
