import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.vsupload_pipeline import generate_single_image

prompt = (
    "Fashion editorial photograph of a model wearing an ivory chiffon "
    "wrap midi dress with V-neck neckline and sleeveless design. "
    "Studio lighting, clean white background, full-body front view, "
    "professional fashion photography, high resolution."
)

api_key = os.getenv("GEMINI_API_KEY")

print("Generating image...")
image_bytes = generate_single_image(prompt, api_key)

if image_bytes:
    output_path = r"C:\Users\VAIDIK\.gemini\antigravity-ide\brain\f14ddc82-54c3-4a92-a916-21dd94fe6b94\scratch\generated_model.jpg"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "wb") as f:
        f.write(image_bytes)
    print(f"Saved to {output_path}")
else:
    print("Failed to generate image.")
