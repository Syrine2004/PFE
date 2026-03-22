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
    
    print("\n" + "#"*60)
    print(f"### [ IDENTITY VERIFICATION : {document_type} ] ###")
    print("#"*60)
    print(f"CANDIDATE: {infos['nom']} {infos['prenom']} | CIN/PASS: {infos['cin']}")
    print("-" * 60)
    print("WEIGHTS: Number(50pts) | Birth(25pts) | Name(25pts)")
    print("-" * 60)

    # 0. Safety Check: Is it really NOT a diploma?
    print(f"\n[PILLAR 0/3] SAFETY CHECK (DOCUMENT TYPE)...")
    if "diplome" in texte_propre.lower() or "attestation" in texte_propre.lower():
        print(" >> WARNING: This looks like a DIPLOMA but I am running the CIN/PASS script.")
        anomalies.append("Ce document ressemble à un Diplôme (Mauvaise catégorie).")

    # 1. Vérification Document (50% du score)
    print(f"\n[PILLAR 1/3] CHECKING {document_type} NUMBER...")
    num_identite = infos['cin']
    match_id = False
    
    if document_type == 'PASSEPORT':
        # Passport often has letters + numbers (e.g., L123456)
        num_clean = clean_for_match(num_identite)
        if num_clean in texte_clean:
            print(f" >> OK: Passport {num_identite} found (exact match) (+50 pts).")
            score += 50
            match_id = True
        else:
            # Look for Alphanumeric blocks of 6-10 chars
            potential_pass = re.findall(r'[A-Z0-9]{6,10}', texte_propre.upper().replace(' ', ''))
            for pp in potential_pass:
                if fuzz.ratio(num_clean.upper(), pp) >= 80:
                    print(f" >> OK: Passport {num_identite} matched fuzzy with '{pp}' (+50 pts).")
                    score += 50
                    match_id = True
                    break
    else:
        # CIN: 8 digits
        if num_identite in texte_clean or num_identite in texte_propre.replace(' ', ''):
            print(f" >> OK: CIN {num_identite} found (exact match) (+50 pts).")
            score += 50
            match_id = True
        else:
            numbers = re.findall(r'\d{6,10}', texte_clean)
            for p in numbers:
                ratio = fuzz.ratio(num_identite, p)
                if ratio >= 90:
                    print(f" >> OK: CIN {num_identite} matched fuzzy with '{p}' ({ratio}%) (+50 pts).")
                    score += 50
                    match_id = True
                    break
    
    if not match_id:
        anomalies.append(f"Numéro {num_identite} non trouvé.")
        print(f" >> WARNING: Identity Number {num_identite} NOT found.")
        
    # 2. Vérification DATE (25% du score)
    print(f"\n[PILLAR 2/3] CHECKING BIRTH YEAR...")
    try:
        date_str = infos.get('dateNaissance', '1970-01-01')
        annee = date_str.split('-')[0]
        
        annee_match = False
        if annee:
            # Check exact and fuzzy (OCR noise)
            annee_alt = annee.replace('0', 'o').replace('1', 'l')
            if annee in texte_clean or annee in texte_propre or annee_alt in texte_propre.lower():
                annee_match = True
            else:
                # Look for 4-digit numbers and find the best match
                potential_years = re.findall(r'\d{4}', texte_clean)
                for py in potential_years:
                    if fuzz.ratio(annee, py) >= 75:
                        print(f" >> OK: Birth year {annee} matched fuzzy with '{py}'.")
                        annee_match = True
                        break

        if annee_match:
            print(f" >> OK: Birth year validated ({annee}) (+25 pts).")
            score += 25
        else:
            anomalies.append(f"Année de naissance {annee} non détectée.")
            print(f" >> WARNING: Birth year {annee} NOT found.")
    except:
        anomalies.append("Erreur format date.")

    # 3. Vérification NOM & PRÉNOM (25% du score)
    print(f"\n[PILLAR 3/3] CHECKING IDENTITY (NOM/PRENOM)...")
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
    identity_score = (identity_conf / 100.0) * 25
    score += identity_score
    
    if identity_conf < 50:
        anomalies.append(f"Identité non confirmée ({identity_conf:.0f}%).")
        print(f" >> WARNING: Identity check FAILED (Confidence: {identity_conf:.0f}%).")
    else:
        print(f" >> OK: Identity validated (Confidence: {identity_conf:.0f}%) (+{identity_score:.1f} pts).")

    print("\n" + "#"*60 + "\n")
    return max(0, min(100, int(score))), anomalies


if __name__ == "__main__":
    import sys
    import json
    
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) > 5:
        chemin_image = sys.argv[1]
        donnees_formulaire = {
            "cin": sys.argv[2],
            "nom": sys.argv[3],
            "prenom": sys.argv[4],
            "dateNaissance": sys.argv[5]
        }
        document_type = sys.argv[6] if len(sys.argv) > 6 else 'CIN'
    else:
        chemin_image = "carte1.jpg" 
        donnees_formulaire = {
            "cin": "14373619", 
            "nom": "sirine",  
            "prenom": "haboubi",
            "dateNaissance": "2004-08-05"
        }
        document_type = 'CIN'

    print("--- START AI ANALYSIS ---")
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
            
        # On affiche toujours les anomalies (même si validé, pour info sur la qualité OCR)
        for ano in liste_anomalies:
            print(f"WARNING: {ano}")
                    
    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        sys.exit(1)