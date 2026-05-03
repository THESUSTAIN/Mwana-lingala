"""Generate 4 watercolor pastel hero images for public pages — same style as
/images/famille-couple-bebe.png (homepage). Style: tender, soft watercolor,
pan-african children-book illustration with Kente patterns, no text in image.
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
    "Watercolor illustration in soft pastel colors, panafrican aesthetic, warm and tender atmosphere, "
    "Kente headwrap and traditional African textile elements, soft realistic style with watercolor "
    "brush strokes (NOT flat illustration), no text or letters in the image, vertical 4:5 portrait "
    "composition, Congolese family characters with warm brown skin tones, beige and pastel green background, "
    "soft sunlight, plants, like a children-book hero illustration. "
)

PROMPTS = {
    "hero-pourquoi-lingala.png": (
        "Three generations of a Congolese family together in a warm living room: a grandmother "
        "wearing a green and gold Kente headwrap whispering Lingala words to a young child sitting "
        "on her lap, the parents watching with proud loving smiles. Open photo album with family "
        "pictures on the table, terracotta vase with palm leaves, soft sunlight from a window. "
        "Sense of cultural transmission, identity, family bond across generations."
    ),
    "hero-assistant-ia.png": (
        "A young Congolese mother and her smiling child of 4 years old together discovering a "
        "magical glowing book that floats slightly in the air. Around the book, soft glowing "
        "particles in pan-african colors (gold, green, brick red) suggesting AI magic — but no "
        "screens, no tech, no text. The mother wears a Kente headwrap. The child laughs in delight. "
        "Sense of wonder, learning, gentle technology helping family bonding."
    ),
    "hero-comment-ca-marche.png": (
        "A Congolese father in casual clothes sitting cross-legged on a colorful pan-african rug "
        "with his two children (a boy and a girl, ages 5 and 7). They are laughing together while "
        "the father holds up his hand showing fingers — clearly a counting or vocabulary game. Around "
        "them, soft floating little symbols (sun, water drop, animal silhouettes — NOT letters) "
        "representing words being learned. Warm window light. Sense of simple, joyful daily routine."
    ),
    "hero-tarifs.png": (
        "A close, tender moment of a Congolese family of three sharing a meal at a wooden table: "
        "a mother in a Kente headwrap, a father, and their toddler who is laughing while reaching "
        "for a piece of fruit. Bowls of plantain, mango, palm-leaf wall decorations. Golden hour "
        "warm light, intimate atmosphere, sense of belonging, value of shared moments — that the "
        "subscription helps preserve. NO text or price labels."
    ),
}


async def gen(client: httpx.AsyncClient, filename: str, prompt: str) -> bool:
    out = OUT_DIR / filename
    if out.exists() and out.stat().st_size > 5000:
        print(f"[skip] {filename} ({out.stat().st_size} B)")
        return True
    body = {
        "model": "gemini-3.1-flash-image-preview",
        "messages": [{"role": "user", "content": STYLE + prompt}],
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
        ok = 0; fail = 0
        for f, p in PROMPTS.items():
            if await gen(client, f, p): ok += 1
            else: fail += 1
        print(f"\nDone. ok={ok} fail={fail}")


if __name__ == "__main__":
    asyncio.run(main())
