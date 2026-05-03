"""Regenerate the Mission hero in the SAME watercolor pastel style as the other 4 public heroes
(hero-pourquoi-lingala.png, hero-assistant-ia.png, hero-comment-ca-marche.png, hero-tarifs.png)."""

import asyncio
import base64
import os
import re
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
MAMMOTH_API_KEY = os.environ.get("MAMMOTH_API_KEY", "")
MAMMOTH_API_URL = os.environ.get("MAMMOTH_API_URL", "https://api.mammouth.ai/v1")
OUT = Path("/app/frontend/public/images/mission-hero.png")

# EXACT same style block as generate_public_hero_images.py — that's the secret to consistency
STYLE = (
    "Watercolor illustration in soft pastel colors, panafrican aesthetic, warm and tender atmosphere, "
    "Kente headwrap and traditional African textile elements, soft realistic style with watercolor "
    "brush strokes (NOT flat illustration), no text or letters in the image, vertical 4:5 portrait "
    "composition, Congolese family characters with warm brown skin tones, beige and pastel green background, "
    "soft sunlight, plants, like a children-book hero illustration. "
)

PROMPT = (
    "A circle of three Congolese diaspora contributors helping each other transmit the Lingala "
    "language: a warm grandmother in a green and gold Kente headwrap holding a smartphone close "
    "to her mouth as if recording her voice tenderly, a young father holding his smiling toddler "
    "while writing in a small notebook, a young woman wearing a beaded headband smiling at a tablet. "
    "Around them, a few soft floating speech bubbles with delicate pan-african pattern shapes — but NO "
    "text, NO letters, NO emojis. Sense of community, generosity, transmission of culture across "
    "generations. Beige pastel background, soft golden hour light, plants and traditional textile "
    "elements visible in soft focus."
)


async def main():
    if not MAMMOTH_API_KEY:
        print("MAMMOTH_API_KEY missing"); sys.exit(1)
    body = {
        "model": "gemini-3.1-flash-image-preview",
        "messages": [{"role": "user", "content": STYLE + PROMPT}],
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{MAMMOTH_API_URL}/chat/completions",
            headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
            json=body, timeout=180,
        )
        if r.status_code != 200:
            print(f"HTTP {r.status_code}: {r.text[:300]}"); sys.exit(1)
        msg = r.json().get("choices", [{}])[0].get("message", {})
        imgs = msg.get("images") or []
        if not imgs:
            print("no images"); sys.exit(1)
        url = imgs[0].get("image_url", {}).get("url", "")
        if url.startswith("data:image"):
            data = base64.b64decode(re.sub(r"^data:image/[^;]+;base64,", "", url))
            OUT.write_bytes(data); print(f"saved {OUT} ({len(data)} B)")
        elif url.startswith("http"):
            rr = await client.get(url, timeout=60); OUT.write_bytes(rr.content)
            print(f"downloaded {OUT} ({len(rr.content)} B)")


if __name__ == "__main__":
    asyncio.run(main())
