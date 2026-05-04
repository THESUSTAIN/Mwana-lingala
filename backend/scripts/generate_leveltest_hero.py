"""Generate a DISTINCT inclusive watercolor pastel image for /test-niveau
(level test landing). Different scene from /apprendre-le-lingala but same inclusive
intent: show that anyone — including a white European person — can take the lingala
level test.
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
    "no text or letters in the image, 4:5 vertical portrait composition, beige and pastel "
    "green background, soft sunlight, plants visible, like a children-book hero illustration."
)

# Different scene than the adult learning page: TWO young women side by side on a comfy sofa,
# both taking the lingala level quiz on their own phones, in a cozy home setting.
# This signals "the test is for everyone, take it together with a friend".
PROMPT_LEVELTEST = (
    "Two young women sitting close together side by side on a comfy beige sofa in a sunny "
    "living room, both happily taking a fun language quiz on their smartphones at the same time. "
    "ON THE LEFT: a young WHITE EUROPEAN woman (around 28-32 years old, light skin, brown wavy "
    "hair tied back, wearing a simple cream cotton sweater), holding her smartphone with a "
    "thoughtful curious expression. ON THE RIGHT: a young BLACK / AFRO-DESCENDANT woman (around "
    "26-30 years old, warm brown skin, natural curly hair pulled back with a colorful Kente "
    "headwrap in red, green, yellow, black, wearing a soft mustard-yellow sweater), also holding "
    "her own smartphone, smiling warmly while glancing at her friend. They look like close "
    "friends supporting each other through the quiz — clear sense of camaraderie, accessibility "
    "and intercultural friendship. Between them on the sofa: a steaming mug of tea, an open "
    "notebook with simple drawings (NOT letters), a Kente-pattern throw pillow with panafrican "
    "colors. On a small wooden side table behind them: a terracotta vase with palm leaves, a "
    "small framed map of Africa, a little succulent plant. Soft golden afternoon light coming "
    "through a window with sheer curtains. Warm, welcoming, calm and slightly studious "
    "atmosphere. The vibe should evoke: 'we are learning lingala together, anyone is welcome.' "
    "Absolutely NO text, NO letters, NO words, NO logos, NO screen content visible on phones."
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
        await gen(client, "hero-test-niveau.png", PROMPT_LEVELTEST)


if __name__ == "__main__":
    asyncio.run(main())
