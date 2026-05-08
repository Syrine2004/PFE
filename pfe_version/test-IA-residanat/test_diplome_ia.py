import cv2
import pytesseract
import re
import os
import sys
import numpy as np
from fuzzywuzzy import fuzz

# --- CONFIGURATION ---
import platform

if platform.system() == "Windows":
    TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
else:
    TESSERACT_PATH = 'tesseract'

def extraire_texte(image_brute, info_cible=None):
    if image_brute is None or not isinstance(image_brute, np.ndarray):
        return ""
    try:
        gray = cv2.cvtColor(image_brute, cv2.COLOR_BGR2GRAY)
        text = pytesseract.image_to_string(gray, lang='fra+ara')
        if info_cible and (info_cible in text or info_cible.replace(' ', '') in text.replace(' ', '')):
            return text
        boosted = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
        text += "\n" + pytesseract.image_to_string(boosted, lang='fra+ara')
        if info_cible and (info_cible in text or info_cible.replace(' ', '') in text.replace(' ', '')):
            return text
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        text += "\n" + pytesseract.image_to_string(adaptive, lang='fra+ara')
        return text
    except: return ""

def clean_for_match(text):
    if not text: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()


def normalize_ocr_confusions(text):
    """Normalize common OCR confusions between letters and digits."""
    if not text:
        return ""
    t = re.sub(r'[^A-Z0-9]', '', text.upper())
    replacements = {
        'O': '0', 'Q': '0', 'D': '0',
        'I': '1', 'L': '1',
        'Z': '2', 'S': '5',
        'B': '8', 'G': '6'
    }
    return ''.join(replacements.get(ch, ch) for ch in t)


def has_diploma_keywords(text):
    t = text.lower()
    keywords = [
        'diplome', 'diploma', 'universit', 'facult', 'doctorat',
        'attestation', 'reussite', 'licence', 'master', 'ingenieur'
    ]
    return any(k in t for k in keywords)

def analyser_conformite(infos, image_brute):
    anomalies = []
    texte_extrait = extraire_texte(image_brute, info_cible=infos.get('cin'))
    texte_propre = texte_extrait.replace('\n', ' ')
    texte_clean = clean_for_match(texte_propre)
    texte_upper = texte_propre.upper()
    texte_norm = normalize_ocr_confusions(texte_upper)
    
    score = 0
    num_identite = infos.get('cin', '')
    match_id = False

    # 1) Preuve forte que c'est bien un diplôme
    has_diploma_evidence = has_diploma_keywords(texte_propre)
    if has_diploma_evidence:
        score += 40
    else:
        anomalies.append("Contenu diplôme peu lisible (mots-clés académiques non détectés).")

    # 2) Match numéro d'identité: bonus optionnel (ne doit pas casser un diplôme valide)
    if num_identite:
        target = normalize_ocr_confusions(str(num_identite).upper())
        compact = re.sub(r'[^A-Z0-9]', '', texte_upper)
        compact_norm = normalize_ocr_confusions(compact)

        if str(num_identite).upper() in compact or target in compact_norm:
            score += 20
            match_id = True
        else:
            # Fallback fuzzy sur tokens alphanumériques
            tokens = re.findall(r'[A-Z0-9]{6,14}', compact)
            for tok in tokens:
                tok_norm = normalize_ocr_confusions(tok)
                if fuzz.ratio(target, tok_norm) >= 88:
                    score += 20
                    match_id = True
                    break

    # Pour le diplôme, l'absence du numéro n'est pas bloquante et ne doit pas polluer l'UI.

    faculte_form = infos.get('faculte', '').strip().lower()
    faculte_found = False
    
    if faculte_form:
        # Nettoyage pour plus de robustesse
        # ex: 'faculte de medecine de tunis' -> 'medecine tunis' pour une recherche partielle
        faculte_keywords = faculte_form.replace('faculté', '').replace('faculte', '').replace('de', '').strip()
        
        # 1. Recherche directe (rapide)
        if faculte_form in texte_propre.lower() or faculte_keywords in texte_propre.lower():
            score += 20
            faculte_found = True
        else:
            # 2. Recherche Fuzzy (comparaison de tokens pour tolérer les erreurs d'OCR)
            # On cherche si un segment du texte ressemble fortement à la faculté attendue
            fuzzy_score = fuzz.partial_ratio(faculte_form, texte_propre.lower())
            if fuzzy_score >= 85:
                score += 20
                faculte_found = True
                print(f"DEBUG: Faculté trouvée via fuzzy matching (score: {fuzzy_score})")
            else:
                anomalies.append(f"Faculté '{faculte_form}' non détectée sur le document.")
    else:
        # Si aucune faculté n'est attendue (cas rare), on ne pénalise pas
        faculte_found = True

    # 2.5) Recherche de l'année avec Regex (plus strict que "in")
    annee_form = infos.get('dateDiplome', '').split('-')[0]
    annee_found = False
    if annee_form:
        # On cherche l'année comme un mot entier pour éviter les faux positifs (ex: 2024 dans un CIN)
        pattern_annee = r'\b' + re.escape(annee_form) + r'\b'
        if re.search(pattern_annee, texte_propre):
            score += 25
            annee_found = True
        else:
            anomalies.append(f"Année {annee_form} non trouvée sur le document.")

    # 3) Bonus nom/prénom si présents
    nom = infos.get('nom', '').strip().lower()
    prenom = infos.get('prenom', '').strip().lower()
    name_hits = 0
    if nom and nom in texte_propre.lower():
        score += 10
        name_hits += 1
    elif nom:
        anomalies.append(f"Nom de famille '{nom.upper()}' introuvable.")

    if prenom and prenom in texte_propre.lower():
        score += 10
        name_hits += 1
    elif prenom:
        anomalies.append(f"Prénom '{prenom.title()}' introuvable.")

    # --- LOGIQUE DE VALIDATION STRICTE ---
    
    # Si l'année est obligatoire mais non trouvée -> Score plafonné à 60
    if annee_form and not annee_found:
        score = min(score, 60)
        
    # Si la faculté est obligatoire mais non trouvée -> Score plafonné à 50
    if faculte_form and not faculte_found:
        score = min(score, 50)
        anomalies.append("CRITICAL: La faculté ne correspond pas.")

    # Pour obtenir 100%, il FAUT que tout soit correct
    if has_diploma_evidence and annee_found and faculte_found and name_hits >= 1:
        score = 100
    else:
        # Sinon on plafonne à 90 pour marquer qu'il manque un élément ou qu'il y a un doute
        score = min(score, 90)

    # Clamp final 0..100
    score = max(0, min(100, int(score)))
    
    return score, anomalies

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    # La Java ProcessBuilder peut envoyer plus d'arguments que ce qui est strictement nécessaire (ex: 10).
    # On reste flexible en vérifiant le nombre minimal requis.
    if len(sys.argv) < 2:
        print("Usage: python test_diplome_ia.py <image_path> [cin] [nom] [prenom] [dateNaissance] [faculte] [dateDiplome]")
        sys.exit(1)

    chemin_image = sys.argv[1]
    
    # Extraction sécurisée des données du formulaire (si présentes)
    # Mapping selon ValidationDocumentaireIAService.java: 
    # 2:cin, 3:nom, 4:prenom, 5:dateNaissance, 6:faculte, 7:dateDiplome
    donnees_formulaire = {
        "cin": sys.argv[2] if len(sys.argv) > 2 else "14373619",
        "nom": sys.argv[3] if len(sys.argv) > 3 else "Sirine",
        "prenom": sys.argv[4] if len(sys.argv) > 4 else "Haboubi",
        "dateNaissance": sys.argv[5] if len(sys.argv) > 5 else "2004-08-05",
        "faculte": sys.argv[6] if len(sys.argv) > 6 else "tunis",
        "dateDiplome": sys.argv[7] if len(sys.argv) > 7 else "2026-03-27"
    }

    try:
        if chemin_image.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_brute = cv2.imdecode(np.fromfile(chemin_image, dtype=np.uint8), cv2.IMREAD_COLOR)
        else:
            image_brute = cv2.imread(chemin_image)

        if image_brute is not None:
            score_final, liste_anomalies = analyser_conformite(donnees_formulaire, image_brute)
        else:
            score_final, liste_anomalies = 0, ["ERREUR: Image non chargée."]

        print(f"RESULT_SCORE: {score_final}")
        for ano in liste_anomalies: print(f"WARNING: {ano}")
    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        sys.exit(1)
