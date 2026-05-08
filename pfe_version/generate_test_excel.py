import pandas as pd

data = {
    'numeroConvocation': [3266],
    'cin': ['11145927'],
    'nomPrenom': ['ABBASSI AICHA'],
    'noteEpreuve1': [16.50],
    'noteEpreuve2': [16.65],
    'moyenneGenerale': [16.58],
    'rang': [103],
    'statut': ['Admis(e)']
}

df = pd.DataFrame(data)
file_path = 'test_resultats_residanat.xlsx'
df.to_excel(file_path, index=False)
print(f"File created successfully at: {file_path}")
