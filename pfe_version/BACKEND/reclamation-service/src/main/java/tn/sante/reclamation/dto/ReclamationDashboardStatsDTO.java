package tn.sante.reclamation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationDashboardStatsDTO {
    private long totalUrgents;
    private List<CategoryStatDTO> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryStatDTO {
        private String categoryId;
        private long total;
        private long critical; // Urgent
        private int resolvedRate;
    }
}
