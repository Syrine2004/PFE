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
    """
    Stratégie Multi-Pass Conditionnelle (V5 Performance).
    Tente une lecture rapide, et ne lance les filtres lents que si nécessaire.
    """
    if image_brute is None or not isinstance(image_brute, np.ndarray):
        print("ERROR: Invalid image provided to extraire_texte.")
        return ""
    
    # 1. Pass Rapide (Grayscale)
    try:
        gray = cv2.cvtColor(image_brute, cv2.COLOR_BGR2GRAY)
    except Exception as e:
        print(f"ERROR in cvtColor: {e}")
        return ""
        
    text = pytesseract.image_to_string(gray, lang='fra+ara+eng')
    
    # Si on a une info cible (ex: numéro CIN) et qu'on la trouve, on s'arrête là !
    if info_cible and (info_cible in text or info_cible.replace(' ', '') in text.replace(' ', '')):
        print("DEBUG: Fast Pass successful (Info found). Skipping slow passes.")
        return text

    print("DEBUG: Info not found in Fast Pass. Starting Heavy Passes...")
    
    # 2. Pass Contrasté
    boosted = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
    text += "\n" + pytesseract.image_to_string(boosted, lang='fra+ara+eng')
    
    if info_cible and (info_cible in text or info_cible.replace(' ', '') in text.replace(' ', '')):
        return text

    # 3. Pass Adaptatif (Le plus lent mais le plus précis)
    adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    text += "\n" + pytesseract.image_to_string(adaptive, lang='fra+ara+eng')
    
    return text

def clean_for_match(text):
    if not text: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()


def normalize_passport_text(text):
    """Normalize OCR text for passport matching (handles common OCR confusions)."""
    if not text:
        return ""
    t = re.sub(r'[^A-Z0-9]', '', text.upper())
    replacements = {
        'O': '0', 'Q': '0', 'D': '0',
        'I': '1', 'L': '1',
        'Z': '2',
        'S': '5',
        'B': '8',
        'G': '6'
    }
    return ''.join(replacements.get(ch, ch) for ch in t)


def passport_tokens_from_text(text):
    """Extract plausible passport id tokens from OCR output and MRZ-like strings."""
    if not text:
        return []

    upper = text.upper()
    raw_tokens = re.findall(r'[A-Z0-9]{6,12}', upper)

    # Handle MRZ separators: P<TUN... style
    mrz_compact = upper.replace('<', '')
    mrz_tokens = re.findall(r'[A-Z0-9]{6,12}', mrz_compact)

    return list(dict.fromkeys(raw_tokens + mrz_tokens))


def passport_id_matches(target, token):
    """Robust passport id matching with MRZ check-digit tolerance."""
    if not target or not token:
        return False

    t = re.sub(r'[^A-Z0-9]', '', target.upper())
    k = re.sub(r'[^A-Z0-9]', '', token.upper())
    if not t or not k:
        return False

    tn = normalize_passport_text(t)
    kn = normalize_passport_text(k)

    # Exact / normalized exact
    if t == k or tn == kn:
        return True

    # Common MRZ case: extra trailing check digit in token
    if len(kn) == len(tn) + 1 and kn.startswith(tn):
        return True
    if len(tn) == len(kn) + 1 and tn.startswith(kn):
        return True

    # One-char OCR drift tolerance around same length
    if abs(len(kn) - len(tn)) <= 1 and fuzz.ratio(tn, kn) >= 88:
        return True

    return False

def handle_arabic_months(text):
    months_map = {
        'جانفي': '01', 'فيفري': '02', 'مارس': '03', 'أفريل': '04', 
        'ماي': '05', 'جوان': '06', 'جويلية': '07', 'أوت': '08',
        'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12'
    }
    processed_text = text
    for name, num in months_map.items():
        processed_text = processed_text.replace(name, num)
    return processed_text

def classifier_document(texte):
    t = texte.lower()
    if any(k in t for k in ["diplom", "facult", "universit", "attestation", "reussite", "doctorat", "scientifique", "tecnologie", "ministere"]):
        return "DIPLOME"
    if any(k in t for k in ["passeport", "passport", "جواز", "travel"]):
        return "PASSEPORT"
    if any(k in t for k in ["carte nationale", "identite", "بطاقة", "التعريف", "الوطنية"]):
        return "CIN"
    return "INCONNU"

def extract_face(image):
    if image is None: return None
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Premier essai (standard)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        # Deuxième essai (plus sensible) si rien trouvé
        if len(faces) == 0:
            faces = face_cascade.detectMultiScale(gray, 1.1, 3)
            
        if len(faces) > 0:
            # On prend le plus grand visage trouvé (évite les petits artefacts)
            x, y, w, h = max(faces, key=lambda f: f[2]*f[3])
            return image[y:y+h, x:x+w]
    except Exception as e:
        print(f"DEBUG: Face extraction error: {e}")
    return None

def comparer_visages(face1, face2):
    if face1 is None or face2 is None: return 0
    f1 = cv2.resize(face1, (128, 128))
    f2 = cv2.resize(face2, (128, 128))
    hsv1 = cv2.cvtColor(f1, cv2.COLOR_BGR2HSV)
    hsv2 = cv2.cvtColor(f2, cv2.COLOR_BGR2HSV)
    hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
    hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
    score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    return max(0, int(score * 100))

def check_template_cin(texte):
    t = texte.lower()
    elements = ["sexe", "nationalité", "signature", "passport", "passeport", "date"]
    count = sum(1 for e in elements if e in t)
    return count >= 1

def analyser_conformite(infos, document_type_attendu, image_brute, photo_profile_brute):
    anomalies = []
    texte_extrait = extraire_texte(image_brute, info_cible=infos.get('cin'))
    
    texte_propre = texte_extrait.replace('\n', ' ')
    texte_clean = clean_for_match(texte_propre)
    
    print("\n" + "#"*60)
    print(f"### [ BIOMETRIC VERIFICATION : {document_type_attendu} ] ###")
    print("#"*60)
    
    score = 0
    type_detecte = classifier_document(texte_extrait)
    if type_detecte != "INCONNU" and type_detecte != document_type_attendu:
        anomalies.append(f"Document détecté comme {type_detecte} au lieu de {document_type_attendu}.")
        return 0, anomalies

    if check_template_cin(texte_extrait):
        print(" >> OK: Official template recognized.")
    else:
        print(" >> WARNING: Document template incomplete.")
        anomalies.append("Format du document non standard.")

    # Biométrie supprimée à la demande de l'utilisateur (on donne les points par défaut)
    print(" >> Biometric Check: Skipped (Always validated).")
    score += 30

    num_identite = infos['cin']
    match_id = False
    
    if document_type_attendu == 'PASSEPORT':
        num_target = re.sub(r'[^A-Z0-9]', '', str(num_identite).upper())
        num_target_norm = normalize_passport_text(num_target)

        ocr_compact = re.sub(r'[^A-Z0-9]', '', texte_extrait.upper())
        ocr_compact_norm = normalize_passport_text(ocr_compact)

        if num_target in ocr_compact or num_target_norm in ocr_compact_norm:
            score += 60
            match_id = True
        else:
            tokens = passport_tokens_from_text(texte_extrait)
            for token in tokens:
                if passport_id_matches(num_target, token):
                    score += 60
                    match_id = True
                    break
    else:
        if num_identite in texte_clean:
            score += 60
            match_id = True
        else:
            numbers = re.findall(r'\d{8}', texte_clean)
            for p in numbers:
                if fuzz.ratio(num_identite, p) >= 90:
                    score += 60
                    match_id = True
                    break
    
    if not match_id:
        anomalies.append(f"Numéro {num_identite} non détecté.")
        
    try:
        date_str = infos.get('dateNaissance', '1970-01-01')
        annee = date_str.split('-')[0]
        if annee and (annee in texte_clean or annee in handle_arabic_months(texte_propre)):
            score += 10
    except: pass

    # Règle métier demandée: si le numéro d'identité (CIN/Passeport) est trouvé,
    # le score identité doit être 100 même si certains champs secondaires manquent.
    if match_id and document_type_attendu in ['CIN', 'PASSEPORT']:
        score = 100

    return max(0, min(100, int(score))), anomalies

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    # Java ProcessBuilder pour CIN/Passport: 7 arguments (8 avec le script)
    if len(sys.argv) < 2:
        print("Usage: python test_ia.py <image_path> [cin] [nom] [prenom] [dateNaissance] [type] [photoPath]")
        sys.exit(1)

    chemin_image = sys.argv[1]
    
    # Extraction sécurisée
    # 2:cin, 3:nom, 4:prenom, 5:dateNaissance, 6:type, 7:photoPath
    donnees_formulaire = {
        "cin": sys.argv[2] if len(sys.argv) > 2 else "14373619",
        "nom": sys.argv[3] if len(sys.argv) > 3 else "Sirine",
        "prenom": sys.argv[4] if len(sys.argv) > 4 else "Haboubi",
        "dateNaissance": sys.argv[5] if len(sys.argv) > 5 else "2004-08-05"
    }
    document_type = sys.argv[6] if len(sys.argv) > 6 else 'CIN'
    
    photo_profile_brute = None
    if len(sys.argv) > 7:
        chemin_photo = sys.argv[7]
        if chemin_photo and os.path.exists(chemin_photo):
            try:
                photo_profile_brute = cv2.imdecode(np.fromfile(chemin_photo, dtype=np.uint8), cv2.IMREAD_COLOR)
            except:
                photo_profile_brute = cv2.imread(chemin_photo)

    print("--- START AI ANALYSIS ---")
    try:
        if chemin_image.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_brute = cv2.imdecode(np.fromfile(chemin_image, dtype=np.uint8), cv2.IMREAD_COLOR)
        else:
            image_brute = cv2.imread(chemin_image)

        if image_brute is not None:
            score_final, liste_anomalies = analyser_conformite(donnees_formulaire, document_type, image_brute, photo_profile_brute)
        else:
            score_final, liste_anomalies = 0, ["ERREUR: Image non chargée."]

        print(f"\n=== FINAL BILL ===\nRESULT_SCORE: {score_final}")
        for ano in liste_anomalies: print(f"WARNING: {ano}")
            
    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)