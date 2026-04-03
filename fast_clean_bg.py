import os
from PIL import Image

def flood_remove_bg(filepath):
    print(f"Processing {filepath}")
    img = Image.open(filepath).convert("RGBA")
    
    width, height = img.size
    pixels = img.load()
    
    # Threshold for considering something 'background'
    # The higher, the stricter. White is 255. Shadows could be 220-240.
    threshold = 225
    
    # Simple BFS flood fill
    # Start from top-left, top-right, bottom-left, bottom-right
    start_nodes = [
        (0,0), (width//2, 0), (width-1, 0),
        (0, height-1), (width//2, height-1), (width-1, height-1),
        (0, height//2), (width-1, height//2)
    ]
    visited = set()
    queue = []
    
    for start in start_nodes:
        if start not in visited:
            queue.append(start)
            visited.add(start)
            
    dirs = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
    
    while queue:
        x, y = queue.pop(0)
        r, g, b, a = pixels[x, y]
        avg = (r + g + b) // 3
        
        # If it's pure white or light grey shadow AND hasn't been made transparent yet
        if avg > threshold and a != 0:
            # Set pixel to fully transparent
            pixels[x, y] = (r, g, b, 0)
            
            # Add neighbors
            for dx, dy in dirs:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))

    # Anti-aliasing cleanup: any remaining near-white pixels get alpha adjusted
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            avg = (r+g+b)//3
            if a > 0 and avg > 240:
                # soften the edges
                pixels[x, y] = (r, g, b, max(0, min(255, 255 - (avg - 240) * 17)))

    img.save(filepath, "PNG")

images = [
    "residanat-frontend-main/src/assets/images/fac_tunis.png",
    "residanat-frontend-main/src/assets/images/fac_sfax.png",
    "residanat-frontend-main/src/assets/images/fac_sousse.png",
    "residanat-frontend-main/src/assets/images/fac_monastir.png",
    "residanat-frontend-main/src/assets/images/car_model.png"
]

for img_path in images:
    if os.path.exists(img_path):
        flood_remove_bg(img_path)
