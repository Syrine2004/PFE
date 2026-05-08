import subprocess
import os

images = [
    "residanat-frontend-main/src/assets/images/fac_tunis.png",
    "residanat-frontend-main/src/assets/images/fac_sfax.png",
    "residanat-frontend-main/src/assets/images/fac_sousse.png",
    "residanat-frontend-main/src/assets/images/fac_monastir.png",
    "residanat-frontend-main/src/assets/images/car_model.png"
]

for img in images:
    if os.path.exists(img):
        print(f"Processing {img}...")
        # Add 'o' mode to overwrite? Or output to temp and rename
        temp_img = img + ".temp.png"
        subprocess.run(["rembg", "i", img, temp_img])
        if os.path.exists(temp_img):
            os.replace(temp_img, img)
            print(f"Finished {img}")
        else:
            print(f"Failed {img}")
    else:
        print(f"File not found: {img}")
