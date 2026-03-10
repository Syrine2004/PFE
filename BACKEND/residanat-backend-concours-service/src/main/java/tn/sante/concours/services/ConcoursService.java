package tn.sante.concours.services;

import tn.sante.concours.dto.ConcoursRequestDTO;
import tn.sante.concours.dto.ConcoursResponseDTO;
import tn.sante.concours.dto.PageResponseDTO;
import tn.sante.concours.models.Etat;

import java.util.UUID;

public interface ConcoursService {
    ConcoursResponseDTO createConcours(ConcoursRequestDTO requestDTO);

    ConcoursResponseDTO updateConcours(UUID id, ConcoursRequestDTO requestDTO);

    void deleteConcours(UUID id);

    ConcoursResponseDTO getConcoursById(UUID id);

    PageResponseDTO<ConcoursResponseDTO> getConcours(Integer annee, String typeConcours, Etat etat,
            int page, int size);

    ConcoursResponseDTO publishConcours(UUID id);

    ConcoursResponseDTO unpublishConcours(UUID id);
}
