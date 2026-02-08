#!/usr/bin/env python3
"""
Script to add <-> arrow in the middle of txgain icons
"""
from PIL import Image, ImageDraw, ImageFont
import os

icon_dir = r"c:\cc\Project\PB\Streamdeck\pbox\com.aurawave.pbox.sdPlugin\imgs\actions\txgain"

# Files to process
files_to_process = [
    ("icon.png", "icon@2x.png"),  # encoder icon pair
    ("key.png", "key@2x.png"),    # key icon pair
]

def add_arrow_to_icon(file_path, is_2x=False):
    """Add <-> arrow in the middle of the icon"""
    try:
        img = Image.open(file_path)
        draw = ImageDraw.Draw(img)
        
        width, height = img.size
        center_x = width // 2
        center_y = height // 2
        
        # Determine font size based on image size
        font_size = int(height * 0.4) if not is_2x else int(height * 0.4)
        
        # Try to use a system font, fallback to default if not available
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        # Draw arrow in white with black outline for better visibility
        arrow_text = "<->"
        
        # Calculate text bounding box to center it properly
        bbox = draw.textbbox((0, 0), arrow_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position at center
        x = center_x - text_width // 2
        y = center_y - text_height // 2
        
        # Draw black outline
        for adj_x in [-2, -1, 0, 1, 2]:
            for adj_y in [-2, -1, 0, 1, 2]:
                if adj_x != 0 or adj_y != 0:
                    draw.text((x + adj_x, y + adj_y), arrow_text, font=font, fill="black")
        
        # Draw white text on top
        draw.text((x, y), arrow_text, font=font, fill="white")
        
        # Save the modified image
        img.save(file_path)
        print(f"✓ Modified: {os.path.basename(file_path)}")
        return True
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

# Process all icon files
print("Adding <-> arrow to txgain icons...\n")

for base_file, x2_file in files_to_process:
    base_path = os.path.join(icon_dir, base_file)
    x2_path = os.path.join(icon_dir, x2_file)
    
    if os.path.exists(base_path):
        add_arrow_to_icon(base_path, is_2x=False)
    else:
        print(f"✗ File not found: {base_file}")
    
    if os.path.exists(x2_path):
        add_arrow_to_icon(x2_path, is_2x=True)
    else:
        print(f"✗ File not found: {x2_file}")

print("\nDone!")
