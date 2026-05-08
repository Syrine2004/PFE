import urllib.request
import sys

puml_file = r"d:\3 eme\pfe\PFE\diagram_sprint_2_final_detaille.puml"
png_file = r"d:\3 eme\pfe\PFE\diagram_sprint_2_final_detaille.png"

try:
    with open(puml_file, "rb") as f:
        data = f.read()

    req = urllib.request.Request("https://kroki.io/plantuml/png", data=data, headers={'Content-Type': 'text/plain', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        with open(png_file, "wb") as out:
            out.write(response.read())
    print("SUCCESS: Image saved to " + png_file)
except Exception as e:
    print("ERROR: ", e)
