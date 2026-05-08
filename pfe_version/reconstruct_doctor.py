from PIL import Image, ImageDraw

def create_doctor_initial(doctor_path, output_path):
    try:
        # Load the doctor (transparent PNG)
        foreground = Image.open(doctor_path).convert("RGBA")
        width, height = foreground.size
        
        # Create a professional hospital corridor background
        # We'll use gradients to simulate depth and clinical lighting
        background = Image.new("RGBA", (width, height), (240, 245, 250, 255))
        draw = ImageDraw.Draw(background)
        
        # Wall/Floor line
        draw.rectangle([0, height * 2 // 3, width, height], fill=(220, 225, 230, 255)) # Floor
        draw.line([0, height * 2 // 3, width, height * 2 // 3], fill=(200, 205, 210, 255), width=2) # Baseboard
        
        # Lighting effect from top-right
        for i in range(width):
            alpha = int((i / width) * 40)
            overlay = Image.new("RGBA", (1, height), (255, 255, 255, alpha))
            background.paste(overlay, (i, 0), overlay)

        # Composite the doctor
        background.paste(foreground, (0, 0), foreground)
        background.save(output_path, "PNG")
        print(f"Created {output_path}")
    except Exception as e:
        print(f"Error: {e}")

# Paths
brain_dir = "C:/Users/sirin/.gemini/antigravity/brain/db336327-feaf-4679-9797-978b38010b6c/"
create_doctor_initial(brain_dir + "doctor_user_provided.png", brain_dir + "doctor_source_final.png")
