package tn.sante.concours.services;

import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import tn.sante.concours.dto.ConcoursRequestDTO;
import tn.sante.concours.dto.ConcoursResponseDTO;
import tn.sante.concours.dto.PageResponseDTO;
import tn.sante.concours.exceptions.DuplicateResourceException;
import tn.sante.concours.exceptions.ResourceNotFoundException;
import tn.sante.concours.models.Concours;
import tn.sante.concours.models.Etat;
import tn.sante.concours.repositories.ConcoursRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ConcoursServiceImpl implements ConcoursService {

    private static final Logger log = LoggerFactory.getLogger(ConcoursServiceImpl.class);

    private final ConcoursRepository concoursRepository;
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    
    @PersistenceContext
    private EntityManager entityManager;

    public ConcoursServiceImpl(ConcoursRepository concoursRepository, org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate) {
        this.concoursRepository = concoursRepository;
        this.rabbitTemplate = rabbitTemplate;
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
        concours.setEtat(Etat.NON_PUBLIE);
        concours.setLieuExamen(requestDTO.getLieuExamen());

        if (requestDTO.getDateDebut() != null && !requestDTO.getDateDebut().isEmpty()) {
            concours.setDateDebut(LocalDate.parse(requestDTO.getDateDebut().substring(0, 10)).atStartOfDay());
        }
        if (requestDTO.getDateFin() != null && !requestDTO.getDateFin().isEmpty()) {
            concours.setDateFin(LocalDate.parse(requestDTO.getDateFin().substring(0, 10)).atStartOfDay());
        }

        concours.setCreatedBy(getCurrentUser());

        Concours savedConcours = concoursRepository.save(concours);
        return mapToDTO(savedConcours);
    }

    @Override
    public ConcoursResponseDTO updateConcours(UUID id, ConcoursRequestDTO requestDTO) {
        log.info("Mise à jour du concours avec ID: {}", id);

        @SuppressWarnings("null")
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
        if (requestDTO.getEtat() != null) {
            concours.setEtat(requestDTO.getEtat());
        }
        if (requestDTO.getLieuExamen() != null) {
            concours.setLieuExamen(requestDTO.getLieuExamen());
        }

        if (requestDTO.getDateDebut() != null && !requestDTO.getDateDebut().isEmpty()) {
            concours.setDateDebut(LocalDate.parse(requestDTO.getDateDebut().substring(0, 10)).atStartOfDay());
        }
        if (requestDTO.getDateFin() != null && !requestDTO.getDateFin().isEmpty()) {
            concours.setDateFin(LocalDate.parse(requestDTO.getDateFin().substring(0, 10)).atStartOfDay());
        }

        concours.setUpdatedBy(getCurrentUser());

        Concours updatedConcours = concoursRepository.save(concours);
        return mapToDTO(updatedConcours);
    }

    @Override
    public void deleteConcours(UUID id) {
        log.info("Suppression du concours avec ID: {}", id);
        @SuppressWarnings("null")
        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        
        concoursRepository.delete(concours);
        
        // Publish deletion event to notify other services (like dossier-service)
        log.info("Publishing ConcoursDeletedEvent for ID: {}", id);
        java.util.Map<String, Object> event = new java.util.HashMap<>();
        event.put("concoursId", id.toString());
        rabbitTemplate.convertAndSend(tn.sante.concours.config.RabbitMQConfig.EXCHANGE_NAME, "concours.deleted", event);
    }

    @Override
    public ConcoursResponseDTO getConcoursById(UUID id) {
        @SuppressWarnings("null")
        Concours concours = concoursRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        return mapToDTO(concours);
    }

    @Override
    public PageResponseDTO<ConcoursResponseDTO> getConcours(Integer annee, String typeConcours,
            Etat etat, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "annee"));
        Page<Concours> concoursPage;

        if (annee != null && (typeConcours != null && !typeConcours.isEmpty()) && etat != null) {
            concoursPage = concoursRepository.findByAnneeAndTypeConcoursContainingIgnoreCaseAndEtat(annee,
                    typeConcours, etat, pageable);
        } else if (annee != null && (typeConcours != null && !typeConcours.isEmpty())) {
            concoursPage = concoursRepository.findByAnneeAndTypeConcoursContainingIgnoreCase(annee, typeConcours,
                    pageable);
        } else if (annee != null && etat != null) {
            concoursPage = concoursRepository.findByAnneeAndEtat(annee, etat, pageable);
        } else if ((typeConcours != null && !typeConcours.isEmpty()) && etat != null) {
            concoursPage = concoursRepository.findByTypeConcoursContainingIgnoreCaseAndEtat(typeConcours,
                    etat, pageable);
        } else if (annee != null) {
            concoursPage = concoursRepository.findByAnnee(annee, pageable);
        } else if (typeConcours != null && !typeConcours.isEmpty()) {
            concoursPage = concoursRepository.findByTypeConcoursContainingIgnoreCase(typeConcours, pageable);
        } else if (etat != null) {
            concoursPage = concoursRepository.findByEtat(etat, pageable);
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
        return changeStatut(id, Etat.PUBLIE);
    }

    @Override
    public ConcoursResponseDTO unpublishConcours(UUID id) {
        log.info("Dépublication du concours avec ID: {}", id);
        return changeStatut(id, Etat.NON_PUBLIE);
    }

    private ConcoursResponseDTO changeStatut(UUID id, Etat nouveauStatut) {
        log.info("Changement de statut pour le concours ID: {} vers {}", id, nouveauStatut);
        if (nouveauStatut == Etat.PUBLIE) {
            log.info("CRITICAL: Enforcing single-published-concours rule for ID: {}", id);
            // 1. Clear before to ensure we don't have stale objects
            entityManager.flush();
            entityManager.clear();
            
            // 2. Run the update
            concoursRepository.unpublishOthersJPQL(id);
            
            // 3. Clear after to ensure Hibernate sees the changes
            entityManager.flush();
            entityManager.clear();
            log.info("CRITICAL: Single-published-concours rule applied.");
        }

        Concours concours = concoursRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Concours introuvable avec l'id :: " + id));
        concours.setEtat(nouveauStatut);
        concours.setUpdatedBy(getCurrentUser());
        return mapToDTO(concoursRepository.saveAndFlush(concours));
    }

    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !authentication.getPrincipal().equals("anonymousUser")) {
            if (authentication.getCredentials() != null && !authentication.getCredentials().toString().isEmpty()) {
                return authentication.getCredentials().toString();
            }
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
        dto.setEtat(concours.getEtat());
        dto.setDateDebut(concours.getDateDebut());
        dto.setDateFin(concours.getDateFin());
        dto.setDateCreation(concours.getDateCreation());
        dto.setDateModification(concours.getDateModification());
        dto.setCreatedBy(concours.getCreatedBy());
        dto.setUpdatedBy(concours.getUpdatedBy());
        dto.setLieuExamen(concours.getLieuExamen());
        return dto;
    }
}
