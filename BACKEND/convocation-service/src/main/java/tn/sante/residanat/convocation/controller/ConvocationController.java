package tn.sante.residanat.convocation.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.sante.residanat.convocation.client.DossierClient;
import tn.sante.residanat.convocation.event.ConvocationReadyEvent;
import tn.sante.residanat.convocation.dto.DossierDto;
import tn.sante.residanat.convocation.exception.EligibilityException;
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
    private final RabbitTemplate rabbitTemplate;

    public ConvocationController(ConvocationRepository convocationRepository, 
                               ConvocationService convocationService,
                               DossierClient dossierClient,
                               RabbitTemplate rabbitTemplate) {
        this.convocationRepository = convocationRepository;
        this.convocationService = convocationService;
        this.dossierClient = dossierClient;
        this.rabbitTemplate = rabbitTemplate;
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
                        rabbitTemplate.convertAndSend(
                                "dossier.exchange",
                                "convocation.ready",
                                new ConvocationReadyEvent(
                                        nouvelleConv.getDossierId(),
                                        nouvelleConv.getCandidatId(),
                                        nouvelleConv.getHashSecurise()
                                )
                        );
                        convocationOpt = Optional.of(nouvelleConv);
                    }
                } catch (EligibilityException e) {
                    throw e;
                } catch (Exception e) {
                    log.error("❌ Échec de la génération automatique pour le dossier {}", dossierId, e);
                }
            }

            if (convocationOpt.isEmpty()) {
                log.warn("⚠️  Convocation introuvable même après tentative de génération pour dossierId : {}", dossierId);
                return ResponseEntity.notFound().build();
            }

            Convocation convocation = convocationOpt.get();
            convocation = convocationService.rafraichirConvocation(convocation);

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
                    .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(contenuPDF);

        } catch (EligibilityException e) {
            log.warn("⛔ Accès convocation refusé (éligibilité): dossierId={}, reason={}", dossierId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            if (isEligibilityFailure(e)) {
                log.warn("⛔ Accès convocation refusé (éligibilité encapsulée): dossierId={}, reason={}", dossierId, extractEligibilityMessage(e));
                return ResponseEntity.status(403).build();
            }
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
                        rabbitTemplate.convertAndSend(
                                "dossier.exchange",
                                "convocation.ready",
                                new ConvocationReadyEvent(
                                        nouvelleConv.getDossierId(),
                                        nouvelleConv.getCandidatId(),
                                        nouvelleConv.getHashSecurise()
                                )
                        );
                        convocationOpt = Optional.of(nouvelleConv);
                    }
                } catch (EligibilityException e) {
                    throw e;
                } catch (Exception e) {
                    log.error("❌ Échec de la génération automatique pour le dossier {}", dossierId, e);
                }
            }

            if (convocationOpt.isEmpty()) {
                log.warn("⚠️  Convocation introuvable même après tentative de génération pour dossierId : {}", dossierId);
                return ResponseEntity.notFound().build();
            }

            Convocation convocation = convocationService.rafraichirConvocation(convocationOpt.get());
            return ResponseEntity.ok(convocation);

        } catch (EligibilityException e) {
            log.warn("⛔ Infos convocation refusées (éligibilité): dossierId={}, reason={}", dossierId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            if (isEligibilityFailure(e)) {
                log.warn("⛔ Infos convocation refusées (éligibilité encapsulée): dossierId={}, reason={}", dossierId, extractEligibilityMessage(e));
                return ResponseEntity.status(403).build();
            }
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

        } catch (EligibilityException e) {
            log.warn("⛔ TEST REFUSÉ (éligibilité): dossierId={}, candidatId={}, reason={}",
                    dossierId, candidatId, e.getMessage());
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            if (isEligibilityFailure(e)) {
                String reason = extractEligibilityMessage(e);
                log.warn("⛔ TEST REFUSÉ (éligibilité encapsulée): dossierId={}, candidatId={}, reason={}",
                        dossierId, candidatId, reason);
                return ResponseEntity.status(403).body(reason);
            }
            log.error("❌ TEST ÉCHOUÉ : Erreur lors de la génération manuelle", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    private boolean isEligibilityFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof EligibilityException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String extractEligibilityMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof EligibilityException && current.getMessage() != null) {
                return current.getMessage();
            }
            current = current.getCause();
        }
        return "Accès refusé: candidat non éligible selon la liste du Ministère.";
    }

    /**
     * Vérification par hash sécurisé (utilisé dans le QR code).
     * Retourne le PDF en affichage inline si le hash existe.
     */
    @GetMapping("/verifier/{hash}")
    public ResponseEntity<byte[]> verifierConvocation(@PathVariable("hash") String hash) {
        try {
            Optional<Convocation> convocationOpt = convocationRepository.findByHashSecurise(hash);
            if (convocationOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Convocation convocation = convocationService.rafraichirConvocation(convocationOpt.get());
            Path fichierPath = Paths.get(convocation.getCheminFichierPdf());
            if (!Files.exists(fichierPath)) {
                return ResponseEntity.internalServerError().build();
            }

            byte[] contenuPDF = Files.readAllBytes(fichierPath);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"convocation.pdf\"")
                    .body(contenuPDF);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la vérification de convocation par hash", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint pour récupérer directement l'image PNG du QR Code sécurisé.
     * Utilisé par le frontend pour afficher le vrai QR code.
     */
    @GetMapping(value = "/qr/{hash}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> obtenirQrCode(@PathVariable("hash") String hash) {
        try {
            Optional<Convocation> convocationOpt = convocationRepository.findByHashSecurise(hash);
            if (convocationOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            byte[] qrImage = convocationService.genererImageQrCode(hash);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
                    .body(qrImage);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la génération du QR code PNG", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
