package tn.sante.concours.services;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tn.sante.concours.dto.ResultatCandidatDto;
import tn.sante.concours.dto.ResultatsPubliesEvent;
import tn.sante.concours.exceptions.ResourceNotFoundException;
import tn.sante.concours.models.Concours;
import tn.sante.concours.models.Etat;
import tn.sante.concours.models.ResultatCandidat;
import tn.sante.concours.repositories.ConcoursRepository;
import tn.sante.concours.repositories.ResultatCandidatRepository;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ResultatService {

    private final ResultatCandidatRepository resultatCandidatRepository;
    private final ConcoursRepository concoursRepository;
    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public ResultatService(ResultatCandidatRepository resultatCandidatRepository,
                           ConcoursRepository concoursRepository,
                           RabbitTemplate rabbitTemplate) {
        this.resultatCandidatRepository = resultatCandidatRepository;
        this.concoursRepository = concoursRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public List<ResultatCandidatDto> importerResultats(MultipartFile file, UUID concoursId) {
        Concours concours = concoursRepository.findById(concoursId)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'ID : " + concoursId));

        if (!hasExcelFormat(file)) {
            throw new IllegalArgumentException("Veuillez charger un fichier Excel valide (.xlsx ou .xls).");
        }

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<ResultatCandidat> resultatsToSave = new ArrayList<>();

            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                ResultatCandidat resultat = new ResultatCandidat();
                resultat.setConcoursId(concoursId);

                // Parsing des colonnes
                // 0: numeroConvocation
                Cell cell0 = currentRow.getCell(0);
                if (cell0 != null) {
                    if (cell0.getCellType() == CellType.NUMERIC) {
                        resultat.setNumeroConvocation((long) cell0.getNumericCellValue());
                    } else if (cell0.getCellType() == CellType.STRING) {
                        resultat.setNumeroConvocation(Long.parseLong(cell0.getStringCellValue().trim()));
                    }
                }

                // 1: cin ou numeroPasseport
                Cell cell1 = currentRow.getCell(1);
                if (cell1 != null) {
                    if (cell1.getCellType() == CellType.NUMERIC) {
                        resultat.setCinOrPassport(String.valueOf((long) cell1.getNumericCellValue()));
                    } else {
                        resultat.setCinOrPassport(cell1.getStringCellValue().trim());
                    }
                }

                // 2: nomPrenom
                Cell cell2 = currentRow.getCell(2);
                if (cell2 != null) resultat.setNomPrenom(cell2.getStringCellValue().trim());

                // 3: noteEpreuve1
                Cell cell3 = currentRow.getCell(3);
                if (cell3 != null) {
                    if (cell3.getCellType() == CellType.NUMERIC) {
                        resultat.setNoteEpreuve1(cell3.getNumericCellValue());
                    } else if (cell3.getCellType() == CellType.STRING) {
                        resultat.setNoteEpreuve1(Double.parseDouble(cell3.getStringCellValue().replace(",", ".")));
                    }
                }

                // 4: noteEpreuve2
                Cell cell4 = currentRow.getCell(4);
                if (cell4 != null) {
                    if (cell4.getCellType() == CellType.NUMERIC) {
                        resultat.setNoteEpreuve2(cell4.getNumericCellValue());
                    } else if (cell4.getCellType() == CellType.STRING) {
                        resultat.setNoteEpreuve2(Double.parseDouble(cell4.getStringCellValue().replace(",", ".")));
                    }
                }

                // 5: moyenneGenerale
                Cell cell5 = currentRow.getCell(5);
                if (cell5 != null) {
                    if (cell5.getCellType() == CellType.NUMERIC) {
                        resultat.setMoyenneGenerale(cell5.getNumericCellValue());
                    } else if (cell5.getCellType() == CellType.STRING) {
                        resultat.setMoyenneGenerale(Double.parseDouble(cell5.getStringCellValue().replace(",", ".")));
                    }
                }

                // 6: rang
                Cell cell6 = currentRow.getCell(6);
                if (cell6 != null) {
                    if (cell6.getCellType() == CellType.NUMERIC) {
                        resultat.setRang((int) cell6.getNumericCellValue());
                    } else if (cell6.getCellType() == CellType.STRING) {
                        resultat.setRang(Integer.parseInt(cell6.getStringCellValue().trim()));
                    }
                }

                // 7: statut
                Cell cell7 = currentRow.getCell(7);
                if (cell7 != null) resultat.setStatut(cell7.getStringCellValue().trim());

                // TODO: Si un FeignClient vers Dossier-Service est ajouté, on pourrait récupérer le candidatId ici
                // resultat.setCandidatId(dossierClient.getCandidatIdByCin(resultat.getCinOrPassport()));

                resultatsToSave.add(resultat);
            }

            // Pour éviter les doublons accidentels, on supprime d'abord les anciens pour ce concours
            resultatCandidatRepository.deleteByConcoursId(concoursId);
            
            List<ResultatCandidat> savedResultats = resultatCandidatRepository.saveAll(resultatsToSave);
            
            return savedResultats.stream().map(this::mapToDto).collect(Collectors.toList());

        } catch (Exception e) {
            throw new RuntimeException("Echec de l'import des données Excel: " + e.getMessage());
        }
    }

    @Transactional
    public void publierResultats(UUID concoursId) {
        Concours concours = concoursRepository.findById(concoursId)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'ID : " + concoursId));

        if (concours.getEtat() == Etat.RESULTATS_PUBLIES) {
            throw new IllegalStateException("Les résultats sont déjà publiés pour ce concours.");
        }

        // 1. Mettre à jour l'état du concours
        concours.setEtat(Etat.RESULTATS_PUBLIES);
        concoursRepository.save(concours);

        // 2. Publier l'événement RabbitMQ
        ResultatsPubliesEvent event = new ResultatsPubliesEvent();
        event.setConcoursId(concoursId);
        event.setTypeConcours(concours.getTypeConcours());
        event.setAnnee(concours.getAnnee());
        event.setDatePublication(LocalDateTime.now());
        event.setMessage("Les résultats finaux du concours de résidanat (" + concours.getAnnee() + ") sont disponibles.");

        rabbitTemplate.convertAndSend("residanat-exchange", "routing.resultats.publies", event);
    }

    public List<ResultatCandidatDto> getResultatsByConcours(UUID concoursId) {
        List<ResultatCandidat> resultats = resultatCandidatRepository.findByConcoursId(concoursId);
        return resultats.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public ResultatCandidatDto getResultatByCinOuConvocation(UUID concoursId, String identifiant) {
        // Essaye d'abord par CIN
        return resultatCandidatRepository.findByConcoursIdAndCinOrPassport(concoursId, identifiant)
                .map(this::mapToDto)
                .orElseGet(() -> {
                    // Sinon par numéro convocation
                    try {
                        Long numConvocation = Long.parseLong(identifiant);
                        return resultatCandidatRepository.findByConcoursIdAndNumeroConvocation(concoursId, numConvocation)
                                .map(this::mapToDto)
                                .orElseThrow(() -> new ResourceNotFoundException("Résultat non trouvé."));
                    } catch (NumberFormatException e) {
                        throw new ResourceNotFoundException("Résultat non trouvé pour ce CIN.");
                    }
                });
    }

    private boolean hasExcelFormat(MultipartFile file) {
        String contentType = file.getContentType();
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".equals(contentType) 
            || "application/vnd.ms-excel".equals(contentType);
    }

    private ResultatCandidatDto mapToDto(ResultatCandidat resultat) {
        ResultatCandidatDto dto = new ResultatCandidatDto();
        dto.setId(resultat.getId());
        dto.setNumeroConvocation(resultat.getNumeroConvocation());
        dto.setCinOrPassport(resultat.getCinOrPassport());
        dto.setNomPrenom(resultat.getNomPrenom());
        dto.setNoteEpreuve1(resultat.getNoteEpreuve1());
        dto.setNoteEpreuve2(resultat.getNoteEpreuve2());
        dto.setMoyenneGenerale(resultat.getMoyenneGenerale());
        dto.setRang(resultat.getRang());
        dto.setStatut(resultat.getStatut());
        dto.setConcoursId(resultat.getConcoursId());
        dto.setCandidatId(resultat.getCandidatId());
        return dto;
    }
}
