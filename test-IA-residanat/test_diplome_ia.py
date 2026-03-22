import cv2
import pytesseract
import re
import os
import numpy as np
from fuzzywuzzy import fuzz

# --- CONFIGURATION ---
import platform

if platform.system() == "Windows":
    TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
else:
    # On Linux (Docker), tesseract is in the PATH
    TESSERACT_PATH = 'tesseract'
    # Pas besoin de spécifier tesseract_cmd s'il est dans le PATH

def extraire_texte(image_path):
    print(f"DEBUG: Tesseract PATH : {TESSERACT_PATH}")
    # Sur Linux, on fait confiance au PATH
    if platform.system() == "Windows" and not os.path.exists(TESSERACT_PATH):
        print(f"ERROR: Tesseract not found at {TESSERACT_PATH}")
        return ""
    
    print(f"DEBUG: Opening image : {image_path}")
    if not os.path.exists(image_path):
        print(f"ERROR: Image file does not exist : {image_path}")
        return ""
    
    try:
        # Lecture robuste pour Windows (chemins avec espaces ou non-ASCII)
        image = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"DEBUG: np.fromfile failed ({e}), trying cv2.imread")
        image = cv2.imread(image_path)
        
    if image is None: 
        print(f"ERROR: OpenCV could not read the image.")
        return ""
        
    gris = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Agrandissement x2
    gris = cv2.resize(gris, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    # Contraste pour faire ressortir l'arabe
    gris = cv2.convertScaleAbs(gris, alpha=1.7, beta=-40)
    
    config_custom = r'--psm 3 --oem 3' 
    try:
        texte = pytesseract.image_to_string(gris, lang='ara+fra', config=config_custom)
        return texte
    except Exception as e:
        print(f"ERROR Tesseract : {e}")
        return ""

def transliterate_ara_to_fra(text):
    """Simple transliteration for Tunisian names to compare with French form."""
    if not text: return ""
    mapping = {
        'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
        'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
        'ة': 'e', 'ى': 'a', 'ئ': 'e', 'ؤ': 'o', 'إ': 'i', 'أ': 'a'
    }
    res = ""
    for char in text:
        res += mapping.get(char, char)
    return res

def clean_for_match(text):
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

def analyser_conformite(texte_extrait, infos, document_type):
    anomalies = []
    score = 0
    
    texte_propre = texte_extrait.replace('\n', ' ')
    texte_clean = clean_for_match(texte_propre)
    
    print("\n" + "*"*60)
    print(f"*** [ DIPLOMA VALIDATION CHECK ] ***")
    print("*"*60)
    print(f"GRADUATE: {infos['nom']} {infos['prenom']} | ID: {infos['cin']}")
    print("-" * 60)
    print("WEIGHTS: ID(40) | Faculty(20) | Year(20) | Name(20)")
    print("-" * 60)

    # 0. Safety Check: Is it really a diploma?
    print(f"\n[PILLAR 0/4] SAFETY CHECK (DOCUMENT TYPE)...")
    keywords = ["diplome", "republique", "tunisienne", "faculte", "universite", "attestation", "reussite"]
    if not any(k in texte_propre.lower() for k in keywords):
        print(" >> WARNING: This does NOT look like a diploma (Keywords missing).")
        anomalies.append("Ce document ne contient pas les mots-clés d'un Diplôme.")

    # 1. Vérification CIN/Identité sur diplôme (40% du score)
    print(f"\n[PILLAR 1/4] CHECKING IDENTITY ON DIPLOMA...")
    num_identite = infos['cin']
    match_id = False
    
    # Try exact match, fuzzy on numbers/alphanumeric
    texte_no_spaces = texte_propre.replace(' ', '')
    num_clean = clean_for_match(num_identite)
    
    if num_identite in texte_clean or num_identite in texte_no_spaces:
        print(f" >> OK: Identity number {num_identite} found (+40 pts).")
        score += 40
        match_id = True
    else:
        # Search for any alphanumeric block of similar length
        # Case 1: 8 digits (CIN)
        potential_ids = re.findall(r'\d{8}', texte_clean)
        # Case 2: Alphanumeric (Passport) - look for blocks of 6-12 chars
        potential_ids += re.findall(r'[A-Z0-9]{6,12}', texte_propre.upper().replace(' ', ''))
        
        for pi in potential_ids:
            if fuzz.ratio(num_clean.upper(), pi.upper()) >= 90:
                print(f" >> OK: Identity number matched fuzzy with '{pi}' (+40 pts).")
                score += 40
                match_id = True
                break
    
    if not match_id:
        print(f" >> NOTICE: Identity number {num_identite} NOT detected clearly. Checking Name instead.")
        
    # 2. Vérification FACULTÉ (20% du score)
    print(f"\n[PILLAR 2/4] CHECKING FACULTY...")
    faculte_attendue = infos.get('faculte', '').strip()
    if faculte_attendue:
        match_fac = fuzz.partial_ratio(faculte_attendue.lower(), texte_propre.lower())
        if match_fac < 70 and len(faculte_attendue) > 3:
             if faculte_attendue.lower() in texte_propre.lower():
                 match_fac = 100
        
        if match_fac >= 70: 
            print(f" >> OK: Faculty '{faculte_attendue}' validated (Confidence: {match_fac}%) (+20 pts).")
            score += 20
        else:
            anomalies.append(f"Faculté '{faculte_attendue}' non détectée.")
            print(f" >> WARNING: Faculty '{faculte_attendue}' NOT found clearly.")
    else:
        print(" >> DEBUG: No faculty specified in form.")

    # 3. Vérification DATES (20% du score)
    print(f"\n[PILLAR 3/4] CHECKING GRADUATION YEAR...")
    date_d_str = infos.get('dateDiplome', '')
    annee_d = date_d_str.split('-')[0] if date_d_str else ''

    annee_match = False
    if annee_d:
        # Check exact and fuzzy (OCR noise)
        annee_alt = annee_d.replace('0', 'o').replace('1', 'l')
        if annee_d in texte_clean or annee_d in texte_propre or annee_alt in texte_propre.lower():
            annee_match = True
        else:
            # Look for 4-digit numbers and find the best match
            potential_years = re.findall(r'\d{4}', texte_clean)
            for py in potential_years:
                if fuzz.ratio(annee_d, py) >= 75: 
                    print(f" >> OK: Diploma year {annee_d} matched fuzzy with '{py}'.")
                    annee_match = True
                    break

    if annee_match:
        score += 20
        print(f" >> OK: Diploma year {annee_d} validated (+20 pts).")
    elif annee_d:
        anomalies.append(f"Année du diplôme {annee_d} non trouvée.")
        print(f" >> WARNING: Diploma year {annee_d} NOT found.")
        
    # 4. Vérification NOM & PRÉNOM (20% du score)
    print(f"\n[PILLAR 4/4] CHECKING NAME ON DIPLOMA...")
    nom_f = infos['nom'].lower().strip()
    prenom_f = infos['prenom'].lower().strip()
    
    # Use token_set_ratio which is better for detecting names in noise
    match_lat_nom = max(fuzz.partial_ratio(nom_f, texte_propre.lower()), fuzz.token_set_ratio(nom_f, texte_propre.lower()))
    match_lat_pre = max(fuzz.partial_ratio(prenom_f, texte_propre.lower()), fuzz.token_set_ratio(prenom_f, texte_propre.lower()))
    
    match_lat = (match_lat_nom + match_lat_pre) / 2
    print(f" >> Latin match: Nom={match_lat_nom}%, Prenom={match_lat_pre}% -> Moy={match_lat}%")
    
    match_ara = 0
    mots_arabes = re.findall(r'[\u0600-\u06FF]+', texte_extrait)
    if mots_arabes:
        texte_trans = transliterate_ara_to_fra(" ".join(mots_arabes))
        match_ara_nom = max(fuzz.partial_ratio(nom_f, texte_trans), fuzz.token_set_ratio(nom_f, texte_trans))
        match_ara_pre = max(fuzz.partial_ratio(prenom_f, texte_trans), fuzz.token_set_ratio(prenom_f, texte_trans))
        match_ara = (match_ara_nom + match_ara_pre) / 2
        print(f" >> Arabic match (translit): Nom={match_ara_nom}%, Prenom={match_ara_pre}% -> Moy={match_ara}%")

    identity_conf = max(match_lat, match_ara)
    identity_points = 20
    identity_score = (identity_conf / 100.0) * identity_points
    score += identity_score
    
    if identity_conf < 50:
        anomalies.append(f"Nom/Prénom non confirmés ({identity_conf:.0f}%).")
        print(f" >> WARNING: Identity check FAILED (Confidence: {identity_conf:.0f}%).")
    else:
        print(f" >> OK: Name validated (Confidence: {identity_conf:.0f}%) (+{identity_score:.1f} pts).")

    print("\n" + "*"*60 + "\n")
    return max(0, min(100, int(score))), anomalies


if __name__ == "__main__":
    import sys
    import json
    
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) > 7:
        chemin_image = sys.argv[1]
        donnees_formulaire = {
            "cin": sys.argv[2],
            "nom": sys.argv[3],
            "prenom": sys.argv[4],
            "dateNaissance": sys.argv[5],
            "faculte": sys.argv[6],
            "dateDiplome": sys.argv[7]
        }
        document_type = sys.argv[8] if len(sys.argv) > 8 else 'DIPLOME'
    else:
        chemin_image = "diplome.jpg" 
        donnees_formulaire = {
            "cin": "06441169", 
            "nom": "hamrouni",  
            "prenom": "ebtissem",
            "dateNaissance": "1981-10-05",
            "faculte": "sousse",
            "dateDiplome": "2026-03-27"
        }
        document_type = 'DIPLOME'

    print("--- START AI ANALYSIS (DIPLOMA) ---")
    print(f"DEBUG: Document Type : {document_type}")
    
    try:
        texte = extraire_texte(chemin_image)
        print(f"\n--- Read Text ---\n{texte}\n---")
        
        score_final, liste_anomalies = analyser_conformite(texte, donnees_formulaire, document_type)
        
        print("\n=== FINAL BILL ===")
        print(f"RESULT_SCORE: {score_final}")
        if score_final >= 70:
            print(f"OK: DOSSIER VALIDATED (Score: {score_final}/100)")
        else:
            print(f"FAILED: DOSSIER REJECTED (Score: {score_final}/100)")
            
        for ano in liste_anomalies:
            print(f"WARNING: {ano}")
                    
    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        sys.exit(1)
