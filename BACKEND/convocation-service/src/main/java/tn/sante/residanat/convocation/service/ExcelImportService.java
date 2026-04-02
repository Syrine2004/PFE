package tn.sante.residanat.convocation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.residanat.convocation.model.AffectationCandidat;
import tn.sante.residanat.convocation.repository.AffectationCandidatRepository;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private final AffectationCandidatRepository affectationRepository;

    @Transactional
    public int importerAffectations(MultipartFile file, String concoursId, boolean replaceExisting) throws Exception {
        if (concoursId == null || concoursId.isBlank()) {
            throw new IllegalArgumentException("concoursId est obligatoire pour l'import Excel.");
        }
        validateExcelFile(file);

        log.info("Début de l'importation du fichier Excel: {} pour concoursId={} (replaceExisting={})",
                file.getOriginalFilename(), concoursId, replaceExisting);
        
        Map<String, AffectationCandidat> affectationsByCin = new LinkedHashMap<>();
        int anneeActuelle = LocalDateTime.now().getYear();

        if (replaceExisting) {
            affectationRepository.deleteByConcoursId(concoursId);
            affectationRepository.flush();
            log.info("Liste existante purgée pour concoursId={} avant réimport de correction.", concoursId);
        }

        try (InputStream is = file.getInputStream();
               Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            // Parcourir les lignes (en sautant l'en-tête à l'index 0)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                // Extraction des colonnes selon l'image fournie
                // A=num, B=cin, C=nom, D=prenom, E=fac, F=Salle, G=n_place
                String num = formatter.formatCellValue(row.getCell(0));
                String cin = normalizeCin(formatter.formatCellValue(row.getCell(1)));
                String nom = formatter.formatCellValue(row.getCell(2));
                String prenom = formatter.formatCellValue(row.getCell(3));
                String fac = formatter.formatCellValue(row.getCell(4));
                String salle = formatter.formatCellValue(row.getCell(5));
                String nPlaceStr = formatter.formatCellValue(row.getCell(6));

                if (cin == null || cin.trim().isEmpty()) {
                    continue; // Skip lines without CIN
                }

                Integer nPlace = null;
                try {
                    if (!nPlaceStr.isEmpty()) {
                        nPlace = Integer.parseInt(nPlaceStr);
                    }
                } catch (NumberFormatException e) {
                    log.warn("Format de place invalide à la ligne {}: {}", i, nPlaceStr);
                }

                // Check if already exists to update or create new
                AffectationCandidat affectation;
                if (replaceExisting) {
                    affectation = new AffectationCandidat();
                } else {
                    affectation = affectationRepository.findByCinAndConcoursId(cin, concoursId)
                            .orElse(new AffectationCandidat());
                }

                affectation.setNum(num);
                affectation.setCin(cin);
                affectation.setConcoursId(concoursId);
                affectation.setNom(nom);
                affectation.setPrenom(prenom);
                affectation.setFac(fac);
                affectation.setSalle(salle);
                affectation.setNPlace(nPlace);
                affectation.setAnneeConcours(anneeActuelle);

                affectationsByCin.put(cin, affectation);
            }

            // Sauvegarde massive
            List<AffectationCandidat> affectations = new ArrayList<>(affectationsByCin.values());
            if (!affectations.isEmpty()) {
                affectationRepository.saveAll(affectations);
                log.info("Importation réussie : {} candidats affectés enregistrés.", affectations.size());
            }
        }

        return affectationsByCin.size();
    }

    private void validateExcelFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide.");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }

        String lower = fileName.toLowerCase();
        boolean isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
        if (!isExcel) {
            throw new IllegalArgumentException("Format non supporté: utilisez uniquement un fichier Excel (.xlsx ou .xls).");
        }
    }

    private String normalizeCin(String cin) {
        if (cin == null) {
            return null;
        }
        return cin.trim().replace(" ", "");
    }
}
