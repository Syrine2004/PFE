import pandas as pd

# Création d'un DataFrame avec la structure attendue par le backend
data = {
    'num': ['2026-RES-0001', '2026-RES-0002'],
    'cin': ['15354368', '11111111'],  # Modifier ici avec votre CIN si besoin
    'nom': ['Boulabiar', 'Test_User'],
    'prenom': ['Syrine', 'Test_Candidat'],
    'fac': ['FMT Tunis', 'FMS Monastir'],
    'Salle': ['Amphithéâtre Ibn El Jazzar', 'Salle de TP 04'],
    'n_place': [123, 45]
}

df = pd.DataFrame(data)

# Sauvegarde au format Excel
output_path = 'd:/3 eme/pfe/PFE/Excel/ministere_test.xlsx'
df.to_excel(output_path, index=False)

print(f"Fichier créé avec succès à : {output_path}")
