"""Generate hero images for Contact and Login pages — same watercolor pastel style."""

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

STYLE = (
    "Watercolor illustration in soft pastel colors, panafrican aesthetic, warm and tender atmosphere, "
    "Kente headwrap and traditional African textile elements, soft realistic style with watercolor "
    "brush strokes (NOT flat illustration), no text or letters in the image, vertical 4:5 portrait "
    "composition, Congolese family characters with warm brown skin tones, beige and pastel green background, "
    "soft sunlight, plants, like a children-book hero illustration. "
)

PROMPTS = {
    "hero-contact.png": (
        "A young Congolese mother sitting on a comfortable couch, holding her smartphone "
        "with a warm peaceful smile while looking gently at the camera — she is reading or "
        "answering a friendly message. A small child plays calmly nearby with wooden toys. "
        "Soft window light from the right, plants in the background, warm beige walls. "
        "Sense of trust, accessibility, friendly support. Calm and welcoming atmosphere — "
        "like she is happy to chat with the team."
    ),
    "hero-login.png": (
        "A loving Congolese father and his young daughter (4 years old) sitting at a wooden "
        "kitchen table together, the father gently holding the daughter on his lap. They are "
        "looking at a small open book together, both smiling tenderly. The daughter has small "
        "braids with colorful beads. Warm golden hour light from the window, a cup of coffee "
        "and African textile placemat on the table. Sense of welcoming, beginning, fresh start, "
        "intimacy of a father-daughter moment of learning. Family bond and gentle invitation."
    ),
}


async def gen(client: httpx.AsyncClient, filename: str, prompt: str) -> bool:
    out = OUT_DIR / filename
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
        print("  → no images")
        return False
    url = imgs[0].get("image_url", {}).get("url", "")
    if url.startswith("data:image"):
        data = base64.b64decode(re.sub(r"^data:image/[^;]+;base64,", "", url))
        out.write_bytes(data); print(f"  → saved {out} ({len(data)} B)"); return True
    if url.startswith("http"):
        rr = await client.get(url, timeout=60); out.write_bytes(rr.content)
        print(f"  → downloaded {out} ({len(rr.content)} B)"); return True
    return False


async def main():
    if not MAMMOTH_API_KEY:
        print("MAMMOTH_API_KEY missing"); sys.exit(1)
    async with httpx.AsyncClient() as client:
        for f, p in PROMPTS.items():
            await gen(client, f, p)


if __name__ == "__main__":
    asyncio.run(main())
