package tn.sante.concours.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tn.sante.concours.dto.ConcoursRequestDTO;
import tn.sante.concours.dto.ConcoursResponseDTO;
import tn.sante.concours.dto.PageResponseDTO;
import tn.sante.concours.exceptions.DuplicateResourceException;
import tn.sante.concours.exceptions.ResourceNotFoundException;
import tn.sante.concours.models.Concours;
import tn.sante.concours.models.StatutResultat;
import tn.sante.concours.repositories.ConcoursRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ConcoursServiceImpl implements ConcoursService {

    private static final Logger log = LoggerFactory.getLogger(ConcoursServiceImpl.class);

    private final ConcoursRepository concoursRepository;

    public ConcoursServiceImpl(ConcoursRepository concoursRepository) {
        this.concoursRepository = concoursRepository;
    }

    @Override
    public ConcoursResponseDTO createConcours(ConcoursRequestDTO requestDTO) {
        log.info("Création d'un nouveau concours avec libelle: {}", requestDTO.getLibelle());

        if (concoursRepository.existsByLibelleAndAnnee(requestDTO.getLibelle(), requestDTO.getAnnee())) {
            throw new DuplicateResourceException("Un concours avec ce libellé et cette année existe déjà.");
        }

        Concours concours = new Concours();
        concours.setTypeConcours(requestDTO.getTypeConcours());
        concours.setLibelle(requestDTO.getLibelle());
        concours.setAnnee(requestDTO.getAnnee());
        concours.setStatutResultat(
                requestDTO.getStatutResultat() != null ? requestDTO.getStatutResultat() : StatutResultat.NON_PUBLIE);
        concours.setCreatedBy(getCurrentUser());

        Concours savedConcours = concoursRepository.save(concours);
        return mapToDTO(savedConcours);
    }

    @Override
    public ConcoursResponseDTO updateConcours(UUID id, ConcoursRequestDTO requestDTO) {
        log.info("Mise à jour du concours avec ID: {}", id);

        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));

        if ((!concours.getLibelle().equals(requestDTO.getLibelle())
                || !concours.getAnnee().equals(requestDTO.getAnnee())) &&
                concoursRepository.existsByLibelleAndAnnee(requestDTO.getLibelle(), requestDTO.getAnnee())) {
            throw new DuplicateResourceException("Un concours avec ce libellé et cette année existe déjà.");
        }

        concours.setTypeConcours(requestDTO.getTypeConcours());
        concours.setLibelle(requestDTO.getLibelle());
        concours.setAnnee(requestDTO.getAnnee());
        if (requestDTO.getStatutResultat() != null) {
            concours.setStatutResultat(requestDTO.getStatutResultat());
        }
        concours.setUpdatedBy(getCurrentUser());

        Concours updatedConcours = concoursRepository.save(concours);
        return mapToDTO(updatedConcours);
    }

    @Override
    public void deleteConcours(UUID id) {
        log.info("Suppression (logique) du concours avec ID: {}", id);
        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        concoursRepository.delete(concours);
    }

    @Override
    public ConcoursResponseDTO getConcoursById(UUID id) {
        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        return mapToDTO(concours);
    }

    @Override
    public PageResponseDTO<ConcoursResponseDTO> getConcours(Integer annee, String typeConcours,
            StatutResultat statutResultat, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "annee"));
        Page<Concours> concoursPage;

        if (annee != null && (typeConcours != null && !typeConcours.isEmpty()) && statutResultat != null) {
            concoursPage = concoursRepository.findByAnneeAndTypeConcoursContainingIgnoreCaseAndStatutResultat(annee,
                    typeConcours, statutResultat, pageable);
        } else if (annee != null && (typeConcours != null && !typeConcours.isEmpty())) {
            concoursPage = concoursRepository.findByAnneeAndTypeConcoursContainingIgnoreCase(annee, typeConcours,
                    pageable);
        } else if (annee != null && statutResultat != null) {
            concoursPage = concoursRepository.findByAnneeAndStatutResultat(annee, statutResultat, pageable);
        } else if ((typeConcours != null && !typeConcours.isEmpty()) && statutResultat != null) {
            concoursPage = concoursRepository.findByTypeConcoursContainingIgnoreCaseAndStatutResultat(typeConcours,
                    statutResultat, pageable);
        } else if (annee != null) {
            concoursPage = concoursRepository.findByAnnee(annee, pageable);
        } else if (typeConcours != null && !typeConcours.isEmpty()) {
            concoursPage = concoursRepository.findByTypeConcoursContainingIgnoreCase(typeConcours, pageable);
        } else if (statutResultat != null) {
            concoursPage = concoursRepository.findByStatutResultat(statutResultat, pageable);
        } else {
            concoursPage = concoursRepository.findAll(pageable);
        }

        List<ConcoursResponseDTO> content = concoursPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        PageResponseDTO<ConcoursResponseDTO> responseDTO = new PageResponseDTO<>();
        responseDTO.setContent(content);
        responseDTO.setPageNumber(concoursPage.getNumber());
        responseDTO.setPageSize(concoursPage.getSize());
        responseDTO.setTotalElements(concoursPage.getTotalElements());
        responseDTO.setTotalPages(concoursPage.getTotalPages());
        responseDTO.setLast(concoursPage.isLast());

        return responseDTO;
    }

    @Override
    public ConcoursResponseDTO publishConcours(UUID id) {
        log.info("Publication du concours avec ID: {}", id);
        return changeStatut(id, StatutResultat.PUBLIE);
    }

    @Override
    public ConcoursResponseDTO unpublishConcours(UUID id) {
        log.info("Dépublication du concours avec ID: {}", id);
        return changeStatut(id, StatutResultat.NON_PUBLIE);
    }

    private ConcoursResponseDTO changeStatut(UUID id, StatutResultat nouveauStatut) {
        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        concours.setStatutResultat(nouveauStatut);
        concours.setUpdatedBy(getCurrentUser());
        return mapToDTO(concoursRepository.save(concours));
    }

    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !authentication.getPrincipal().equals("anonymousUser")) {
            return authentication.getName();
        }
        return "system";
    }

    private ConcoursResponseDTO mapToDTO(Concours concours) {
        ConcoursResponseDTO dto = new ConcoursResponseDTO();
        dto.setId(concours.getId());
        dto.setTypeConcours(concours.getTypeConcours());
        dto.setLibelle(concours.getLibelle());
        dto.setAnnee(concours.getAnnee());
        dto.setStatutResultat(concours.getStatutResultat());
        dto.setDateCreation(concours.getDateCreation());
        dto.setDateModification(concours.getDateModification());
        dto.setCreatedBy(concours.getCreatedBy());
        dto.setUpdatedBy(concours.getUpdatedBy());
        return dto;
    }
}
