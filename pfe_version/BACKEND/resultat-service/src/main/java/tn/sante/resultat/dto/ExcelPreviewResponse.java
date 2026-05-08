package tn.sante.resultat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExcelPreviewResponse {
    private String fileName;
    private List<String> headers;
    private List<List<String>> rows;
}
