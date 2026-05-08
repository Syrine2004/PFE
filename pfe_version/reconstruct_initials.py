from PIL import Image, ImageDraw

def create_initial_from_result(result_path, initial_path, bg_type="sky"):
    try:
        # Load the result (transparent PNG)
        foreground = Image.open(result_path).convert("RGBA")
        width, height = foreground.size
        
        # Create a background
        background = Image.new("RGBA", (width, height), (255, 255, 255, 255))
        draw = ImageDraw.Draw(background)
        
        if bg_type == "sky":
            # Sky gradient
            for i in range(height // 2):
                r = int(135 + (i / (height//2)) * 65)
                g = int(206 + (i / (height//2)) * 29)
                b = int(235 + (i / (height//2)) * 20)
                draw.line([(0, i), (width, i)], fill=(r, g, b, 255))
            # Ground
            draw.rectangle([0, height // 2, width, height], fill=(100, 100, 100, 255))
        elif bg_type == "road":
            draw.rectangle([0, 0, width, height], fill=(120, 120, 120, 255))
            # Road lines
            for i in range(0, width, 40):
                draw.rectangle([i, height // 2 - 2, i + 20, height // 2 + 2], fill=(255, 255, 255, 255))
        elif bg_type == "office":
            draw.rectangle([0, 0, width, height], fill=(220, 230, 240, 255))
            draw.rectangle([0, height // 3, width, height], fill=(240, 240, 240, 255))

        # Composite
        background.paste(foreground, (0, 0), foreground)
        background.save(initial_path, "PNG")
        print(f"Created {initial_path}")
    except Exception as e:
        print(f"Error: {e}")

# Paths
brain_dir = "C:/Users/sirin/.gemini/antigravity/brain/db336327-feaf-4679-9797-978b38010b6c/"

create_initial_from_result(brain_dir + "fac_tunis_result.png", brain_dir + "fac_tunis_source.png", "sky")
create_initial_from_result(brain_dir + "car_result.png", brain_dir + "car_source.png", "road")
create_initial_from_result(brain_dir + "doctor_result.png", brain_dir + "doctor_source.png", "office")
