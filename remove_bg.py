import sys
import os

try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

def remove_white_bg_soft(file_path):
    print(f"Processing {file_path}")
    img = Image.open(file_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # Any pixel above 230 RGB is treated as background to some degree
    threshold = 235
    for item in datas:
        # Calculate grayscale value for the pixel
        avg = (item[0] + item[1] + item[2]) / 3
        
        if avg > threshold:
            # The closer to 255, the more transparent
            # at 255 -> alpha = 0
            # at threshold -> alpha = 255
            alpha = int(255 - ((avg - threshold) / (255 - threshold)) * 255)
            # Make sure it doesn't leave white halos by keeping the original color but adding transparency
            newData.append((item[0], item[1], item[2], alpha))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(file_path, "PNG")

if __name__ == "__main__":
    files = [
        "d:/3 eme/pfe/PFE/residanat-frontend-main/src/assets/images/fac_tunis.png",
        "d:/3 eme/pfe/PFE/residanat-frontend-main/src/assets/images/fac_sfax.png",
        "d:/3 eme/pfe/PFE/residanat-frontend-main/src/assets/images/fac_sousse.png",
        "d:/3 eme/pfe/PFE/residanat-frontend-main/src/assets/images/fac_monastir.png"
    ]
    for f in files:
        if os.path.exists(f):
            remove_white_bg_soft(f)
    print("Background removal completed.")
