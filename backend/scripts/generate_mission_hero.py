"""Generate the Mission/Contribuer page hero image (community of contributors)."""

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
OUT.parent.mkdir(parents=True, exist_ok=True)

PROMPT = (
    "Soft pastel children book illustration, panafrican aesthetic, warm friendly tones, "
    "simple flat design with thick rounded shapes, no text or letters in the image, "
    "16:9 horizontal landscape composition. Scene: a circle of three diverse Congolese "
    "diaspora adults — one elder grandmother in a Kente headwrap recording her voice into "
    "a smartphone microphone, one young father holding his smiling child while writing in "
    "a notebook, one young woman wearing headphones smiling at a tablet. Around them, "
    "softly floating speech bubbles with abstract African pattern shapes (no readable text). "
    "Warm beige and pastel green background, sun rays, plants. Sense of community, "
    "transmission, generosity. Joyful and tender atmosphere."
)

async def main():
    body = {"model": "gemini-3.1-flash-image-preview", "messages": [{"role": "user", "content": PROMPT}]}
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{MAMMOTH_API_URL}/chat/completions",
            headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
            json=body, timeout=180,
        )
        if r.status_code != 200:
            print(f"HTTP {r.status_code}: {r.text[:300]}"); sys.exit(1)
        msg = r.json().get("choices", [{}])[0].get("message", {})
        imgs = msg.get("images") or []
        if not imgs:
            print("No images in response"); sys.exit(1)
        url = imgs[0].get("image_url", {}).get("url", "")
        if url.startswith("data:image"):
            data = base64.b64decode(re.sub(r"^data:image/[^;]+;base64,", "", url))
            OUT.write_bytes(data); print(f"saved {OUT} ({len(data)} bytes)")
        elif url.startswith("http"):
            rr = await c.get(url, timeout=60); OUT.write_bytes(rr.content)
            print(f"downloaded {OUT} ({len(rr.content)} bytes)")

if __name__ == "__main__":
    asyncio.run(main())
