import os
from PIL import Image, ImageDraw, ImageFilter

SOURCE_IMG = r"C:\Users\Hype 5 X5-2\.gemini\antigravity\brain\3e0e7705-e6d9-4420-955a-44660b1b3daf\.user_uploaded\media_1793078930806_8013d885.jpg"
WORKSPACE = r"D:\room chat"

def main():
    img = Image.open(SOURCE_IMG).convert("RGBA")
    print(f"Loaded original image: {img.size}")

    # Center of badge: (515, 205)
    # Size 270x270 gives nice breathing room for glowing particle effects around the squircle
    center_x, center_y = 515, 205
    half_size = 135
    badge_crop = img.crop((
        center_x - half_size,
        center_y - half_size,
        center_x + half_size,
        center_y + half_size
    )) # 270x270

    # High quality 512x512 base badge
    badge_512 = badge_crop.resize((512, 512), Image.Resampling.LANCZOS)

    # Round version with circular mask
    mask = Image.new("L", (512, 512), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((8, 8, 504, 504), fill=255)
    badge_round_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    badge_round_512.paste(badge_512, (0, 0), mask=mask)

    # Full logo crop (Badge + "Ayera" text)
    # X: 335 to 695 (width 360), Y: 60 to 440 (height 380)
    logo_full = img.crop((335, 60, 695, 440))
    
    # 1. Output to public/ and src/app/
    public_dir = os.path.join(WORKSPACE, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    app_dir = os.path.join(WORKSPACE, "src", "app")
    os.makedirs(app_dir, exist_ok=True)

    # Save favicon & icons
    badge_512.save(os.path.join(public_dir, "icon.png"), "PNG")
    badge_512.save(os.path.join(public_dir, "logo.png"), "PNG")
    badge_512.save(os.path.join(app_dir, "icon.png"), "PNG")

    # 192x192
    b192 = badge_512.resize((192, 192), Image.Resampling.LANCZOS)
    b192.save(os.path.join(public_dir, "icon-192.png"), "PNG")

    # 180x180 apple touch icon
    b180 = badge_512.resize((180, 180), Image.Resampling.LANCZOS)
    b180.save(os.path.join(public_dir, "apple-icon.png"), "PNG")
    b180.save(os.path.join(app_dir, "apple-icon.png"), "PNG")

    # 32x32 favicon png
    b32 = badge_512.resize((32, 32), Image.Resampling.LANCZOS)
    b32.save(os.path.join(public_dir, "favicon.png"), "PNG")

    # favicon.ico (multi-size: 16, 32, 48)
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    badge_512.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=favicon_sizes)
    badge_512.save(os.path.join(app_dir, "favicon.ico"), format="ICO", sizes=favicon_sizes)

    # Horizontal logo
    logo_full.save(os.path.join(public_dir, "logo-full.png"), "PNG")

    print("[OK] Web public/ and src/app/ branding assets created successfully.")

    # 2. Output to Android res mipmap directories
    res_dir = os.path.join(WORKSPACE, "android", "app", "src", "main", "res")
    
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in densities.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Standard square/squircle icon
        square_icon = badge_512.resize((size, size), Image.Resampling.LANCZOS)
        square_icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # Round icon
        round_icon = badge_round_512.resize((size, size), Image.Resampling.LANCZOS)
        round_icon.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        print(f"[OK] Generated {folder} ({size}x{size})")

    # Also save play store / root icon 512x512
    badge_512.save(os.path.join(WORKSPACE, "android", "ic_launcher-web.png"), "PNG")
    print("[OK] All Android branding assets created successfully.")

if __name__ == "__main__":
    main()
