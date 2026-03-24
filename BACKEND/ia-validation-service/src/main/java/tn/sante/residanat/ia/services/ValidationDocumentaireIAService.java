package tn.sante.residanat.ia.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ValidationDocumentaireIAService {
    private static final Pattern RESULT_SCORE_PATTERN = Pattern.compile("RESULT_SCORE:\\s*([-+]?\\d+(?:[.,]\\d+)?)");
    private static final long PYTHON_TIMEOUT_SECONDS = 45;

    @Value("${ia.script.path}")
    private String pythonScriptPath;

    @Value("${ia.script.diplome.path:/app/scripts/test_diplome_ia.py}")
    private String pythonScriptDiplomePath;

    @Value("${ia.script.photo.path:/app/scripts/test_photo_ia.py}")
    private String pythonScriptPhotoPath;

    public Map<String, Object> analyserDocument(Map<String, Object> data) {
        Map<String, Object> result = new HashMap<>();
        try {
            // Extraction des infos nécessaires
            String imagePath = (String) data.get("imagePath");
            String cin = (String) data.get("cin");
            String nom = (String) data.get("nom");
            String prenom = (String) data.get("prenom");
            String dateNaissance = (String) data.get("dateNaissance");
            String faculte = (String) data.get("faculte"); // Spécifique au diplôme
            String dateDiplome = (String) data.get("dateDiplome"); // Spécifique au diplôme
            if (faculte == null)
                faculte = ""; // Pour éviter les null
            if (dateDiplome == null)
                dateDiplome = "";
            String photoIdentitePath = (String) data.get("photoIdentitePath");
            if (photoIdentitePath == null)
                photoIdentitePath = "";

            String type = (String) data.get("type");
            if (type == null)
                type = "CIN";

            // Choix du script et des paramètres selon le type
            ProcessBuilder pb;
            if ("DIPLOME".equalsIgnoreCase(type)) {
                // Commande : python test_diplome_ia.py <imagePath> <cin> <nom> <prenom>
                // <dateNaissance> <faculte> <dateDiplome> <type> <photoIdentitePath>
                pb = new ProcessBuilder(
                        "python",
                        pythonScriptDiplomePath,
                        imagePath,
                        cin,
                        nom,
                        prenom,
                        dateNaissance,
                        faculte,
                        dateDiplome,
                        type,
                        photoIdentitePath);
            } else if ("PHOTO_IDENTITE".equalsIgnoreCase(type)) {
                // Commande : python test_photo_ia.py <imagePath>
                pb = new ProcessBuilder(
                        "python",
                        pythonScriptPhotoPath,
                        imagePath);
            } else {
                // Commande : python test_ia.py <imagePath> <cin> <nom> <prenom> <dateNaissance>
                // <type> <photoIdentitePath>
                pb = new ProcessBuilder(
                        "python",
                        pythonScriptPath,
                        imagePath,
                        cin,
                        nom,
                        prenom,
                        dateNaissance,
                        type,
                        photoIdentitePath);
            }

            // Merge stderr into stdout to avoid blocking on unread error stream.
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // On lit la sortie du script
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
                output.append(line).append("\n");
            }

            boolean completed = process.waitFor(PYTHON_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                result.put("score", null);
                result.put("verified", false);
                result.put("anomalies", "Erreur IA: timeout script Python");
                result.put("type", type);
                return result;
            }
            int exitCode = process.exitValue();

            // On parse le résultat
            String fullOutput = output.toString();
            Double score = null;
            Matcher scoreMatcher = RESULT_SCORE_PATTERN.matcher(fullOutput);
            if (scoreMatcher.find()) {
                String scoreStr = scoreMatcher.group(1).replace(',', '.');
                score = Double.parseDouble(scoreStr);
            }

            // Extraction des anomalies
            java.util.List<String> warnings = new java.util.ArrayList<>();
            for (String l : fullOutput.split("\n")) {
                if (l.contains("WARNING:")) {
                    String[] parts = l.split("WARNING:");
                    if (parts.length > 1) {
                        warnings.add(parts[1].trim());
                    }
                }
            }
            String anomalies = warnings.isEmpty() ? "Aucune anomalie détectée." : String.join("\n", warnings);

            if (score == null) {
                anomalies = "Score IA introuvable dans la sortie Python. " + anomalies;
            }

            System.out.println("IA Analysis Complete for " + type + ". Score: " + score);

            result.put("score", score);
            result.put("verified", exitCode == 0);
            result.put("anomalies", anomalies);
            result.put("type", type);
            result.put("rawOutput", fullOutput);

        } catch (Exception e) {
            System.err.println("IA Analysis Error: " + e.getMessage());
            result.put("score", null);
            result.put("verified", false);
            result.put("anomalies", "Erreur IA: " + e.getMessage());
        }

        return result;
    }
}
