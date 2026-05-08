package tn.sante.resultat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportStatsResponse {
    private long totalResults;
    private long totalImports;
    private LatestImportDetails latestImport;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatestImportDetails {
        private String fileName;
        private LocalDateTime importedAt;
        private Integer importedCount;
        private String concoursId;
    }
}
