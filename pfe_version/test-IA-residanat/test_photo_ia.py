import cv2
import sys
import numpy as np
import pytesseract
import os


def estimate_skin_ratio(face_bgr):
    """Estimate visible skin ratio in face ROI using broad YCrCb skin thresholds."""
    if face_bgr is None or face_bgr.size == 0:
        return 0.0

    ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
    lower = np.array([0, 133, 77], dtype=np.uint8)
    upper = np.array([255, 173, 127], dtype=np.uint8)
    mask = cv2.inRange(ycrcb, lower, upper)

    # Light denoise to avoid tiny noisy blobs.
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    skin_pixels = cv2.countNonZero(mask)
    total_pixels = mask.shape[0] * mask.shape[1]
    if total_pixels == 0:
        return 0.0
    return skin_pixels / float(total_pixels)


def bbox_iou(a, b):
    """Compute IoU between two bounding boxes (x, y, w, h)."""
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx2, by2 = bx1 + bw, by1 + bh

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    if inter_area == 0:
        return 0.0

    area_a = aw * ah
    area_b = bw * bh
    denom = area_a + area_b - inter_area
    if denom <= 0:
        return 0.0
    return inter_area / float(denom)

def analyser_photo(image_path):
    """
    Analyse une photo d'identité pour s'assurer que c'est bien un visage
    et non un document ou un objet.
    """
    if not os.path.exists(image_path):
        return 0, ["Fichier introuvable."]

    try:
        # Lecture de l'image
        image = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    except:
        image = cv2.imread(image_path)

    if image is None:
        return 0, ["Impossible de lire l'image."]

    anomalies = []
    critical_anomalies = []
    score = 100

    # 1. Vérifications de qualité d'image (base)
    img_h, img_w = image.shape[:2]
    if img_w < 300 or img_h < 300:
        anomalies.append("Résolution un peu faible.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    if brightness < 40:
        anomalies.append("Photo sombre.")
    elif brightness > 225:
        anomalies.append("Photo trop lumineuse.")

    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    if sharpness < 35:
        anomalies.append("Photo floue.")
    elif sharpness < 55:
        anomalies.append("Photo légèrement floue.")

    # 2. Détection visage/yeux/expression
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    eye_glasses_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')
    
    raw_faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))

    # Keep only face candidates with minimal eye evidence to reduce false positives.
    if len(raw_faces) > 0:
        plausible_faces = []
        for (fx, fy, fw, fh) in raw_faces:
            roi = gray[fy:fy+fh, fx:fx+fw]
            upper = roi[0:int(fh * 0.65), :]
            cand_eyes = eye_cascade.detectMultiScale(upper, scaleFactor=1.1, minNeighbors=4, minSize=(14, 14))
            if len(cand_eyes) == 0:
                cand_eyes = eye_glasses_cascade.detectMultiScale(upper, scaleFactor=1.1, minNeighbors=3, minSize=(14, 14))
            if len(cand_eyes) >= 1:
                plausible_faces.append((fx, fy, fw, fh))

        if len(plausible_faces) > 0:
            raw_faces = plausible_faces

    # Deduplicate overlapping detections of the same face.
    if len(raw_faces) > 1:
        faces_sorted = sorted(raw_faces, key=lambda f: f[2] * f[3], reverse=True)
        dedup_faces = []
        for f in faces_sorted:
            if all(bbox_iou(f, kept) < 0.35 for kept in dedup_faces):
                dedup_faces.append(f)
        raw_faces = dedup_faces

    if len(raw_faces) == 0:
        faces = []
        critical_anomalies.append("Aucun visage détecté. Uploadez une photo d'identité face caméra.")
    else:
        # Ignore tiny artifact detections and keep only significant faces.
        areas = [w * h for (_, _, w, h) in raw_faces]
        max_area = max(areas)
        frame_area = float(img_w * img_h)
        faces = [
            f for f in raw_faces
            if (f[2] * f[3]) >= (0.35 * max_area) and ((f[2] * f[3]) / frame_area) >= 0.015
        ]

        if len(faces) == 0:
            # Fallback to the largest detection if filtering became too strict.
            faces = [max(raw_faces, key=lambda f: f[2] * f[3])]

        if len(faces) > 1:
            sorted_faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            largest_area = sorted_faces[0][2] * sorted_faces[0][3]
            second_area = sorted_faces[1][2] * sorted_faces[1][3]

            # If one face is clearly dominant, treat smaller ones as artifacts.
            if largest_area >= (2.0 * second_area):
                faces = [sorted_faces[0]]
            else:
                critical_anomalies.append("Plusieurs visages détectés. Une seule personne est autorisée.")

    if len(faces) == 1:
        # Un seul visage trouvé, on vérifie cadrage/pose/expression
        x, y, w, h = faces[0]
        face_area = (w * h) / float(img_w * img_h)
        if face_area < 0.08:
            critical_anomalies.append("Visage trop loin du cadre.")
        elif face_area > 0.70:
            anomalies.append("Visage trop proche du cadre.")

        face_center_x = x + (w / 2.0)
        frame_center_x = img_w / 2.0
        center_offset = abs(face_center_x - frame_center_x) / float(img_w)
        if center_offset > 0.28:
            anomalies.append("Visage mal centré.")

        roi_gray = gray[y:y+h, x:x+w]
        roi_color = image[y:y+h, x:x+w]
        upper_face = roi_gray[0:int(h * 0.65), :]
        eyes = eye_cascade.detectMultiScale(upper_face, scaleFactor=1.1, minNeighbors=4, minSize=(18, 18))

        if len(eyes) < 2:
            # Seconde chance pour lunettes
            eyes = eye_glasses_cascade.detectMultiScale(upper_face, scaleFactor=1.1, minNeighbors=4, minSize=(18, 18))
        if len(eyes) < 2:
            # Troisième passe plus permissive pour réduire les faux négatifs
            eyes = eye_glasses_cascade.detectMultiScale(upper_face, scaleFactor=1.05, minNeighbors=3, minSize=(14, 14))
        
        if len(eyes) < 2:
            anomalies.append("Yeux peu visibles.")
        else:
            # On prend les deux plus grands yeux détectés pour vérifier l'horizontalité
            eye_boxes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
            if len(eye_boxes) == 2:
                y1 = eye_boxes[0][1] + eye_boxes[0][3] / 2.0
                y2 = eye_boxes[1][1] + eye_boxes[1][3] / 2.0
                eye_level_delta = abs(y1 - y2) / float(h)
                if eye_level_delta > 0.12:
                    anomalies.append("Tête trop inclinée. Gardez la tête droite.")

        # Anti-animal / non-humain:
        # keep this conservative to avoid false rejects on valid human photos.
        # We require both very low skin evidence and weak eye evidence.
        skin_ratio = estimate_skin_ratio(roi_color)
        if skin_ratio < 0.02 and len(eyes) < 2:
            critical_anomalies.append("Visage non humain probable (photo animale ou objet).")

    # 3. Anti-document OCR (toujours activé)
    try:
        texte = pytesseract.image_to_string(gray, lang='fra+ara+eng')
        mots = [m for m in texte.split() if len(m.strip()) > 2]
        if len(mots) > 20:
            critical_anomalies.append("Trop de texte détecté: ce fichier ressemble à un document et non à une photo d'identité.")
    except Exception:
        # On n'échoue pas le contrôle sur un souci OCR seul.
        pass

    all_anomalies = critical_anomalies + anomalies

    # Règle simple et stable:
    # - Cas critiques uniquement => rejet (score 0)
    # - Sinon => accepté à 100, même si des warnings existent.
    if len(critical_anomalies) > 0:
        score = 0
    else:
        score = 100

    # Aide au diagnostic: utile pour comprendre rapidement un rejet dans les logs.
    print(f"DEBUG_METRICS: brightness={brightness:.1f}, sharpness={sharpness:.1f}, faces_raw={len(raw_faces)}, faces_kept={len(faces)}")
    if len(faces) == 1:
        print(f"DEBUG_METRICS: face_area={face_area:.3f}, center_offset={center_offset:.3f}, eyes={len(eyes)}, skin_ratio={skin_ratio:.3f}")

    return score, all_anomalies

if __name__ == "__main__":
    try:
        # Java ProcessBuilder peut envoyer beaucoup d'arguments. 
        # On ne prend que le premier (image_path) pour l'analyse photo.
        if len(sys.argv) < 2:
            print("Usage: python test_photo_ia.py <image_path>")
            sys.exit(1)

        image_path = sys.argv[1]
        print("--- START PHOTO ANALYSIS ---")
        
        score, anomalies = analyser_photo(image_path)
        
        print("\n=== FINAL BILL ===")
        print(f"RESULT_SCORE: {score}")
        for ano in anomalies:
            print(f"WARNING: {ano}")
        
        if score >= 70:
            print(f"OK: PHOTO VALIDATED")
        else:
            print(f"FAILED: PHOTO REJECTED")
    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
