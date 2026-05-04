"""Generate inclusive watercolor pastel hero image for /apprendre-pour-soi
(adult learners landing). The image must signal that EVERYONE can learn lingala —
including non-Congolese (white) adults, Congolese diaspora youth, and travelers.

Style is consistent with other public hero images (soft watercolor pastel,
panafrican aesthetic, no text in image, 4:5 vertical).
"""

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
OUT_DIR = Path("/app/frontend/public/images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Watercolor illustration in soft pastel colors, panafrican aesthetic, warm and tender "
    "atmosphere, soft realistic style with watercolor brush strokes (NOT flat illustration), "
    "no text or letters in the image, vertical 4:5 portrait composition, beige and pastel "
    "green background, soft sunlight, plants, like a children-book hero illustration."
)

PROMPT_INCLUSIVE = (
    "An inclusive learning scene: three diverse young adults (ages 25-35) sitting together "
    "around a round wooden table, sharing a tender moment of language exchange. ON THE LEFT: a "
    "young Congolese woman with warm brown skin tone wearing a colorful Kente headwrap, smiling "
    "while pointing to a beautifully illustrated Lingala vocabulary card. IN THE MIDDLE: a young "
    "WHITE EUROPEAN woman with light skin and brown hair, wearing a simple cream sweater, leaning "
    "in attentively with a happy curious expression — clearly learning the language. ON THE RIGHT: "
    "a young Congolese man with medium-brown skin, casual modern clothes, listening warmly. The "
    "table holds a steaming mug of tea, an open notebook, and small flashcards with simple drawings "
    "(NOT letters). Soft golden window light, terracotta vase with palm leaves in background, "
    "panafrican-inspired tablecloth pattern. Sense of intercultural friendship, accessibility and "
    "the universality of learning — anyone can learn Lingala, regardless of origin. Warm, welcoming, "
    "calm atmosphere. NO text, NO letters, NO screens visible."
)


async def gen(client: httpx.AsyncClient, filename: str, prompt: str) -> bool:
    out = OUT_DIR / filename
    body = {
        "model": "gemini-3.1-flash-image-preview",
        "messages": [{"role": "user", "content": STYLE + " " + prompt}],
    }
    print(f"[gen] {filename} …")
    r = await client.post(
        f"{MAMMOTH_API_URL}/chat/completions",
        headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
        json=body, timeout=180,
    )
    if r.status_code != 200:
        print(f"  → HTTP {r.status_code}: {r.text[:300]}")
        return False
    msg = r.json().get("choices", [{}])[0].get("message", {})
    imgs = msg.get("images") or []
    if not imgs:
        print("  → no images in response")
        return False
    url = imgs[0].get("image_url", {}).get("url", "")
    if url.startswith("data:image"):
        data = base64.b64decode(re.sub(r"^data:image/[^;]+;base64,", "", url))
        out.write_bytes(data); print(f"  → saved {out} ({len(data)} B)"); return True
    if url.startswith("http"):
        rr = await client.get(url, timeout=60); out.write_bytes(rr.content)
        print(f"  → downloaded {out} ({len(rr.content)} B)"); return True
    print(f"  → unknown URL: {url[:120]}")
    return False


async def main():
    if not MAMMOTH_API_KEY:
        print("MAMMOTH_API_KEY missing"); sys.exit(1)
    async with httpx.AsyncClient() as client:
        await gen(client, "hero-apprendre-pour-soi.png", PROMPT_INCLUSIVE)


if __name__ == "__main__":
    asyncio.run(main())
