"""Generate category illustrations + child mascot for the child dashboard."""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

ITEMS = [
    {
        "name": "cat-famille",
        "prompt": "Soft watercolor children's book illustration: a happy young Black African family - father, mother and child - smiling together, simple pastel cream background with soft warm orange tint. Square format. No text, no logo. Centered subjects, lots of negative space.",
    },
    {
        "name": "cat-nourriture",
        "prompt": "Soft watercolor children's book illustration: a juicy red apple and a yellow banana side by side, simple pastel cream background with soft blue tint. Square format. Cute, warm, hand-painted texture. No text, no logo.",
    },
    {
        "name": "cat-jouets",
        "prompt": "Soft watercolor children's book illustration: a cute brown teddy bear next to a colorful striped ball, simple pastel cream background with soft green tint. Square format. Hand-painted texture. No text, no logo.",
    },
    {
        "name": "cat-emotions",
        "prompt": "Soft watercolor children's book illustration: a single big red heart, simple pastel cream background with soft pink tint. Square format. Hand-painted texture. No text, no logo.",
    },
    {
        "name": "cat-maison",
        "prompt": "Soft watercolor children's book illustration: a small cozy house with a red roof and a yellow door, simple pastel cream background with soft purple tint. Square format. Hand-painted texture. No text, no logo.",
    },
    {
        "name": "child-mascot",
        "prompt": "Soft watercolor illustration of a happy young Black African boy (around 6-8 years old) waving with a big smile, wearing a green t-shirt. Standing in front of a soft pastel landscape with trees and clouds. Friendly, joyful, cartoon style. Portrait orientation. No text, no logo, no watermark.",
    },
]

OUT_DIR = Path("/app/frontend/public/images")


async def gen(item):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id=f"cat-{item['name']}", system_message="Generate illustrations.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    text, images = await chat.send_message_multimodal_response(UserMessage(text=item["prompt"]))
    if not images:
        print(f"FAIL: {item['name']}")
        return
    img_bytes = base64.b64decode(images[0]["data"])
    out = OUT_DIR / f"{item['name']}.png"
    out.write_bytes(img_bytes)
    print(f"OK: {out} ({len(img_bytes)} bytes)")


async def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for it in ITEMS:
        await gen(it)


if __name__ == "__main__":
    asyncio.run(main())
