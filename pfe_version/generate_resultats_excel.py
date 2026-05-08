#!/usr/bin/env python3
"""
Script pour générer un fichier CSV exemple pour l'import des résultats
Format: numeroConvocation | cin | nomPrenom | noteEpreuve1 | noteEpreuve2 | moyenneGenerale | rang | statut
"""

import csv

# Données d'exemple - 15 candidats
headers = [
    "numeroConvocation",
    "cin",
    "nomPrenom",
    "noteEpreuve1",
    "noteEpreuve2",
    "moyenneGenerale",
    "rang",
    "statut"
]

data = [
    [3266, 11145927, "ABBASSI AICHA", 16.499882537, 16.6525722199, 16.5762273784, 103, "Admis(e)"],
    [3267, 11056234, "BEN SALEM FATIMA", 17.234567890, 16.876543210, 17.0555555550, 45, "Admis(e)"],
    [3268, 12234567, "GHARBI MOHAMMAD", 15.678901234, 15.456789012, 15.5678450230, 156, "Ajourné(e)"],
    [3269, 11567890, "HAMMAMI LEILA", 18.123456789, 17.987654321, 18.0550555550, 22, "Admis(e)"],
    [3270, 11234456, "JEBALI KARIM", 14.234567890, 14.876543210, 14.5555555550, 287, "Ajourné(e)"],
    [3271, 12456789, "KHALED SAMIRA", 16.987654321, 17.123456789, 17.0555555550, 88, "Admis(e)"],
    [3272, 11789012, "LOUNIS OMAR", 15.234567890, 15.678901234, 15.4567890120, 198, "Ajourné(e)"],
    [3273, 12567890, "MAHFOUDHI NADIA", 17.567890123, 17.234567890, 17.4012345670, 58, "Admis(e)"],
    [3274, 11901234, "NAWAF AHMED", 18.678901234, 18.456789012, 18.5678450230, 12, "Admis(e)"],
    [3275, 12678901, "OUESLATI MARIAM", 14.789012345, 14.567890123, 14.6789567340, 312, "Ajourné(e)"],
    [3276, 11123445, "PRAT SALIM", 16.234567890, 16.987654321, 16.6111111110, 112, "Admis(e)"],
    [3277, 12789012, "QAID YASMINE", 17.890123456, 17.678901234, 17.7845067450, 36, "Admis(e)"],
    [3278, 11234560, "RAOUF HASSAN", 15.567890123, 15.234567890, 15.4012345670, 226, "Ajourné(e)"],
    [3279, 12345678, "SOUISSI AMAL", 18.234567890, 18.567890123, 18.4011234560, 8, "Admis(e)"],
    [3280, 11456789, "TURKI BADIS", 14.456789012, 14.234567890, 14.3456789120, 298, "Ajourné(e)"],
]

# Créer fichier CSV
output_csv = "resultats_exemple.csv"
with open(output_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(data)

print(f"✅ Fichier CSV créé: {output_csv}")
print(f"📊 Données: {len(data)} candidats")
print(f"\nPour convertir en Excel:")
print(f"  1. Ouvrir le CSV avec Excel")
print(f"  2. Faire 'Enregistrer sous' → Format Excel (.xlsx)")
