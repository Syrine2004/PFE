package tn.sante.residanat.gateway_service;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;

@RestController
public class RoutingController {

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/api/external-routing/v1")
    public ResponseEntity<String> getRoute(
            @RequestParam String profile,
            @RequestParam String coords) {
        
        // BRouter uses "|" instead of ";" and profile names are different
        String brouterCoords = coords.replace(";", "|");
        String brouterProfile = profile.equals("foot") ? "foot-short" : "car-fast";
        
        String url = "https://brouter.de/brouter?lonlats=" + brouterCoords + "&profile=" + brouterProfile + "&alternativeidx=0&format=geojson";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String body = response.getBody();
                // Extremely simplified mapping to OSRM format for the frontend
                // Extract coordinates string
                String coordsMatch = "\"coordinates\":\\[(.*?)\\]";
                java.util.regex.Matcher mCoords = java.util.regex.Pattern.compile(coordsMatch).matcher(body);
                String coordsPart = mCoords.find() ? mCoords.group(1) : "";

                // Extract distance and time
                java.util.regex.Matcher mDist = java.util.regex.Pattern.compile("\"track-length\":\"(.*?)\"").matcher(body);
                java.util.regex.Matcher mTime = java.util.regex.Pattern.compile("\"total-time\":\"(.*?)\"").matcher(body);
                
                String distance = mDist.find() ? mDist.group(1) : "0";
                String duration = mTime.find() ? mTime.group(1) : "0";

                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "application/json")
                    .body("{\"routes\":[{\"geometry\":{\"coordinates\":[" + coordsPart + "]},\"distance\":" + distance + ",\"duration\":" + duration + "}]}");
            }
        } catch (Exception e) {
            System.err.println("BRouter failed: " + e.getMessage());
        }

        return ResponseEntity.status(502).body("{\"error\": \"Routing provider unreachable\"}");
    }
}
