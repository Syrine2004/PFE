package tn.sante.residanat.convocation.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.sante.residanat.convocation.client.DossierClient;
import tn.sante.residanat.convocation.dto.DossierDto;
import tn.sante.residanat.convocation.model.Convocation;
import tn.sante.residanat.convocation.repository.ConvocationRepository;
import tn.sante.residanat.convocation.service.ConvocationService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

/**
 * Contrôleur REST pour la gestion des convocations.
 * Expose les endpoints pour le téléchargement et la consultation des convocations par le frontend Angular.
 */
@RestController
@RequestMapping("/api/convocations")
public class ConvocationController {

    private static final Logger log = LoggerFactory.getLogger(ConvocationController.class);
    private final ConvocationRepository convocationRepository;
    private final ConvocationService convocationService;
    private final DossierClient dossierClient;

    public ConvocationController(ConvocationRepository convocationRepository, 
                               ConvocationService convocationService,
                               DossierClient dossierClient) {
        this.convocationRepository = convocationRepository;
        this.convocationService = convocationService;
        this.dossierClient = dossierClient;
    }

    /**
     * Endpoint de téléchargement du PDF de convocation.
     * 
     * Accès sécurisé : recherche la convocation par dossierId, puis retourne le fichier PDF
     * suivi de la mise à jour du nombre de téléchargements.
     * 
     * @param dossierId l'identifiant du dossier
     * @return ResponseEntity contenant le contenu PDF avec les headers HTTP appropriés
     *         - Content-Type: application/pdf
     *         - Content-Disposition: attachment; filename="convocation.pdf"
     *         - Statut HTTP 200 si succès
     *         - Statut HTTP 404 si convocation non trouvée
     *         - Statut HTTP 500 si erreur lors de la lecture du fichier
     */
    @GetMapping("/telecharger/{dossierId}")
    public ResponseEntity<byte[]> telechargerConvocation(@PathVariable Long dossierId) {
        try {
            log.info("📥 Demande de téléchargement de convocation pour dossier : {}", dossierId);

            // ============================================================
            // 1. Recherche la convocation en base de données par dossierId
            // ============================================================
            Optional<Convocation> convocationOpt = convocationRepository.findByDossierId(dossierId);

            // Si la convocation n'existe pas, on tente une génération à la volée (Lazy Generation)
            if (convocationOpt.isEmpty()) {
                log.info("🔄 Tentative de génération à la volée pour le dossier : {}", dossierId);
                try {
                    DossierDto dossier = dossierClient.getDossierById(dossierId);
                    if (dossier != null) {
                        Convocation nouvelleConv = convocationService.genererConvocation(
                            dossier.getId(), 
                            dossier.getCandidatId(), 
                            dossier.getConcoursId()
                        );
                        convocationOpt = Optional.of(nouvelleConv);
                    }
                } catch (Exception e) {
                    log.error("❌ Échec de la génération automatique pour le dossier {}", dossierId, e);
                }
            }

            if (convocationOpt.isEmpty()) {
                log.warn("⚠️  Convocation introuvable même après tentative de génération pour dossierId : {}", dossierId);
                return ResponseEntity.notFound().build();
            }

            Convocation convocation = convocationOpt.get();

            // ============================================================
            // 2. Lecture du fichier PDF depuis le disque dur
            // ============================================================
            Path fichierPath = Paths.get(convocation.getCheminFichierPdf());

            // Vérification que le fichier existe
            if (!Files.exists(fichierPath)) {
                log.error("❌ Fichier PDF non trouvé sur le disque : {}", convocation.getCheminFichierPdf());
                return ResponseEntity.internalServerError().build();
            }

            // Lecture l'intégralité du fichier PDF en bytes
            byte[] contenuPDF = Files.readAllBytes(fichierPath);

            log.info("✅ Fichier PDF lu avec succès. Taille : {} bytes", contenuPDF.length);

            // ============================================================
            // 3. Mise à jour du compteur de téléchargements
            // ============================================================
            convocation.setNombreTelechargements(convocation.getNombreTelechargements() + 1);
            convocationRepository.save(convocation);

            log.info("📊 Nombre de téléchargements mis à jour : {}", convocation.getNombreTelechargements());

            // ============================================================
            // 4. Construction de la réponse HTTP avec headers appropriés
            // ============================================================
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"convocation.pdf\"")
                    .body(contenuPDF);

        } catch (Exception e) {
            log.error("❌ Erreur lors du téléchargement de la convocation pour dossierId : {}", dossierId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint optionnel pour consulter les métadonnées d'une convocation (sans télécharger le PDF).
     * Utile pour le frontend pour afficher les informations avant le téléchargement.
     * 
     * @param dossierId l'identifiant du dossier
     * @return ResponseEntity contenant la convocation en JSON
     *         - Statut HTTP 200 si trouvée
     *         - Statut HTTP 404 si non trouvée
     */
    @GetMapping("/info/{dossierId}")
    public ResponseEntity<Convocation> obtenirInfoConvocation(@PathVariable Long dossierId) {
        try {
            log.info("ℹ️  Demande d'infos convocation pour dossier : {}", dossierId);

            Optional<Convocation> convocationOpt = convocationRepository.findByDossierId(dossierId);

            // Si la convocation n'existe pas, on tente une génération à la volée
            if (convocationOpt.isEmpty()) {
                log.info("🔄 Tentative de génération à la volée pour le dossier : {}", dossierId);
                try {
                    DossierDto dossier = dossierClient.getDossierById(dossierId);
                    if (dossier != null) {
                        Convocation nouvelleConv = convocationService.genererConvocation(
                            dossier.getId(), 
                            dossier.getCandidatId(), 
                            dossier.getConcoursId()
                        );
                        convocationOpt = Optional.of(nouvelleConv);
                    }
                } catch (Exception e) {
                    log.error("❌ Échec de la génération automatique pour le dossier {}", dossierId, e);
                }
            }

            if (convocationOpt.isEmpty()) {
                log.warn("⚠️  Convocation introuvable même après tentative de génération pour dossierId : {}", dossierId);
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(convocationOpt.get());

        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des infos convocation pour dossierId : {}", dossierId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint de TEST pour générer manuellement une convocation sans passer par RabbitMQ.
     * 
     * Utile pour :
     * - Tester le cycle complet de génération PDF/QR en développement
     * - Contourner les problèmes de configuration RabbitMQ
     * - Forcer la génération d'une convocation sans attendre le dossier-service
     * 
     * ⚠️ À DÉSACTIVER EN PRODUCTION
     * 
     * Accès : http://localhost:8086/api/convocations/test-generation/{dossierId}/{candidatId}/{concoursId}
     * 
     * @param dossierId l'identifiant du dossier
     * @param candidatId l'identifiant du candidat
     * @param concoursId l'identifiant du concours (UUID)
     * @return ResponseEntity avec le message de succès incluant le hash de sécurisation
     *         - Statut HTTP 200 si succès
     *         - Statut HTTP 500 si erreur
     */
    @GetMapping("/test-generation/{dossierId}/{candidatId}/{concoursId}")
    public ResponseEntity<String> testGenerationConvocation(
            @PathVariable Long dossierId,
            @PathVariable Long candidatId,
            @PathVariable UUID concoursId) {
        try {
            log.info("🧪 TEST : Génération manuelle de convocation pour dossier={}, candidat={}, concours={}",
                    dossierId, candidatId, concoursId);

            // Appel direct au service de génération
            Convocation convocation = convocationService.genererConvocation(dossierId, candidatId, concoursId);

            log.info("✅ TEST RÉUSSI : Convocation générée avec le hash {}", convocation.getHashSecurise());

            return ResponseEntity.ok("Convocation générée avec succès ! Hash : " + convocation.getHashSecurise());

        } catch (Exception e) {
            log.error("❌ TEST ÉCHOUÉ : Erreur lors de la génération manuelle", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
