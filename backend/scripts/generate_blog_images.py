"""Generate Nano-Banana blog hero images and save them to frontend/public/images/blog/.

Run manually: `python /app/backend/scripts/generate_blog_images.py` (or via supervisor).

Style is aligned with the Mwana Lingala homepage: soft pastel pan-African children-book
illustration, friendly warm tones, no text, square 1:1 then resized to 16:9 by Tailwind.
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
IMAGE_MODEL = "gemini-3.1-flash-image-preview"

OUT_DIR = Path("/app/frontend/public/images/blog")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# slug → prompt (English prompt, but final imagery is universal)
PROMPTS = {
    "je-t-aime-en-lingala": (
        "A loving Congolese family scene: a parent gently holding their smiling young child, "
        "warm sunlight, soft pastel colors, panafrican aesthetic with Kente patterns, "
        "tenderness and bond, no text in the image."
    ),
    "bonjour-en-lingala": (
        "Two young Congolese friends greeting each other warmly in a Kinshasa street, "
        "soft pastel colors, warm sunset light, panafrican children book illustration style, "
        "joyful smiles, no text in the image."
    ),
    "traduction-francais-lingala-guide": (
        "Open colorful book showing French and Lingala words side-by-side, decorative pan-African "
        "patterns on the page borders, soft pastel background, children illustration style, "
        "no readable text, only abstract letters and symbols."
    ),
    "apprendre-lingala-enfant": (
        "Young Congolese parent reading a book to their child at home, warm cozy living room, "
        "African textiles, pastel palette, panafrican children book illustration, focus on bond "
        "and learning, no text in the image."
    ),
    "mots-lingala-indispensables": (
        "Colorful pan-African vocabulary chart with friendly icons (sun, water, family, food), "
        "soft pastel background, rounded shapes, children book style, panafrican aesthetic, "
        "no readable text in the image."
    ),
    "apprendre-le-lingala-guide-debutant": (
        "Adult beginner happily learning Lingala on a notebook with a smartphone audio app, "
        "warm sunny corner, African plants and textiles, pastel pan-African style, "
        "children book illustration, no readable text."
    ),
    "comment-apprendre-lingala-enfant": (
        "Father and daughter laughing together while practicing Lingala words at home, "
        "kitchen background, warm pastel colors, panafrican aesthetic, children book illustration, "
        "tenderness and complicity, no text in the image."
    ),
    "histoire-du-lingala-origine-evolution": (
        "Stylized Congo river at sunset with traditional fishing pirogue and silhouette of "
        "Kinshasa skyline, warm orange and pastel sky, soft pan-African illustration style, "
        "no text in the image."
    ),
    "compter-en-lingala-chiffres-1-100": (
        "Colorful playful numbers floating around a smiling Congolese child counting on fingers, "
        "soft pastel background with African geometric patterns, children book illustration, "
        "no readable text — only abstract digit shapes."
    ),
}

STYLE = (
    "Soft pastel children book illustration, panafrican aesthetic, warm friendly tones, "
    "simple flat design with thick rounded shapes, no text or letters in the image, "
    "16:9 horizontal landscape composition, centered subject on a calm pastel background. "
)


async def gen_one(client: httpx.AsyncClient, slug: str, prompt: str) -> bool:
    out = OUT_DIR / f"{slug}.png"
    if out.exists() and out.stat().st_size > 5000:
        print(f"[skip] {slug} (already exists, {out.stat().st_size} bytes)")
        return True
    body = {
        "model": IMAGE_MODEL,
        "messages": [{"role": "user", "content": STYLE + prompt}],
    }
    print(f"[gen] {slug} …")
    r = await client.post(
        f"{MAMMOTH_API_URL}/chat/completions",
        headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
        json=body,
        timeout=180,
    )
    if r.status_code != 200:
        print(f"  → HTTP {r.status_code}: {r.text[:200]}")
        return False
    js = r.json()
    msg = js.get("choices", [{}])[0].get("message", {})
    imgs = msg.get("images") or []
    if not imgs:
        print(f"  → no images in response")
        return False
    url = imgs[0].get("image_url", {}).get("url", "")
    if url.startswith("data:image"):
        b64 = re.sub(r"^data:image/[^;]+;base64,", "", url)
        try:
            data = base64.b64decode(b64)
            out.write_bytes(data)
            print(f"  → saved {out} ({len(data)} bytes)")
            return True
        except Exception as e:
            print(f"  → decode error: {e}")
            return False
    if url.startswith("http"):
        rr = await client.get(url, timeout=60)
        if rr.status_code == 200:
            out.write_bytes(rr.content)
            print(f"  → downloaded {out} ({len(rr.content)} bytes)")
            return True
        print(f"  → download error {rr.status_code}")
        return False
    print(f"  → unknown URL format: {url[:120]}")
    return False


async def main():
    if not MAMMOTH_API_KEY:
        print("MAMMOTH_API_KEY missing in /app/backend/.env")
        sys.exit(1)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    async with httpx.AsyncClient() as client:
        ok = 0; fail = 0
        for slug, prompt in PROMPTS.items():
            if only and only != slug:
                continue
            success = await gen_one(client, slug, prompt)
            if success: ok += 1
            else: fail += 1
        print(f"\nDone. ok={ok} fail={fail}")


if __name__ == "__main__":
    asyncio.run(main())
