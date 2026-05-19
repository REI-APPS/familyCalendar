"""Generate the app icon using OpenAI gpt-image-1 via Emergent LLM key."""
import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv("/app/backend/.env")

KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-48229D99c3eC716380")

PROMPT = (
    "A modern flat vector app icon for a family scheduling app. "
    "Design: a stylized calendar grid (3x3 light squares) on a warm cream background (#FDFDF9). "
    "In the center of the calendar, a small heart shape in coral pink (#FF8FA3) with two tiny "
    "abstract people silhouettes overlapping. Soft rounded corners. No text, no letters, no words. "
    "Minimal, clean, friendly, family-oriented, suitable for Google Play Store. "
    "Composition centered with generous safe-zone padding (about 18% margin). "
    "Square 1:1 aspect ratio."
)


async def main():
    out_dir = "/app/frontend/assets/images"
    os.makedirs(out_dir, exist_ok=True)
    gen = OpenAIImageGeneration(api_key=KEY)
    print("Generating icon... (this can take up to 1 minute)")
    images = await gen.generate_images(prompt=PROMPT, model="gpt-image-1", number_of_images=1)
    if not images:
        raise RuntimeError("No image was returned")
    icon_path = os.path.join(out_dir, "icon.png")
    adaptive_path = os.path.join(out_dir, "adaptive-icon.png")
    favicon_path = os.path.join(out_dir, "favicon.png")
    with open(icon_path, "wb") as f:
        f.write(images[0])
    with open(adaptive_path, "wb") as f:
        f.write(images[0])
    with open(favicon_path, "wb") as f:
        f.write(images[0])
    print(f"Saved: {icon_path}")
    print(f"Saved: {adaptive_path}")
    print(f"Saved: {favicon_path}")


if __name__ == "__main__":
    asyncio.run(main())
