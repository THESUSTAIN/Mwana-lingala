"""Generate 3 testimonial portraits (panafricain)."""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

PEOPLE = [
    {
        "name": "grace",
        "prompt": (
            "Soft watercolor illustration portrait of a young Black African woman (Congolese, around 30 years old), "
            "warm smile, wearing a colorful headwrap. Square frame, clean cream background with subtle warm highlights, "
            "watercolor texture, modern children's book aesthetic, soft pastel palette. Friendly, motherly. "
            "No earrings, no jewelry. No text, no logo, no watermark. Bust shot, head and shoulders centered."
        ),
    },
    {
        "name": "joseph",
        "prompt": (
            "Soft watercolor illustration portrait of a young Black African man (Congolese, around 32 years old), "
            "kind smile, short hair, wearing a casual green or earth-toned shirt. Square frame, cream background, "
            "watercolor texture, modern children's book aesthetic. Warm, fatherly, trustworthy. "
            "No text, no logo, no watermark. Bust shot, head and shoulders centered."
        ),
    },
    {
        "name": "clementine",
        "prompt": (
            "Soft watercolor illustration portrait of a Black African woman (Congolese, around 35 years old), "
            "joyful smile, wearing a colorful African headscarf (rose or ochre tones). Square frame, cream background, "
            "watercolor texture, modern children's book aesthetic. Bright, cheerful, motherly. "
            "No earrings. No text, no logo, no watermark. Bust shot, head and shoulders centered."
        ),
    },
]

OUT_DIR = Path("/app/frontend/public/images")


async def gen(person):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id=f"test-{person['name']}", system_message="Generate images.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    text, images = await chat.send_message_multimodal_response(UserMessage(text=person["prompt"]))
    if not images:
        print(f"FAIL: {person['name']} no images")
        return
    img_bytes = base64.b64decode(images[0]["data"])
    out = OUT_DIR / f"temoignage-{person['name']}.png"
    out.write_bytes(img_bytes)
    print(f"OK: {out} ({len(img_bytes)} bytes)")


async def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for p in PEOPLE:
        await gen(p)


if __name__ == "__main__":
    asyncio.run(main())
