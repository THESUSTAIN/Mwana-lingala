"""Generate 87 illustrations for Mwana Lingala dictionary words via Mammouth Nano Banana 2.

Saves each image as PNG in /app/frontend/public/images/words/<slug>.png
Uses concurrent batches of 4 to stay safe with Mammouth rate limits.
"""
import os
import re
import sys
import base64
import asyncio
import unicodedata
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import requests
from dotenv import load_dotenv

# Make backend module importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from seed_data import WORDS  # noqa: E402

load_dotenv("/app/backend/.env")
KEY = os.environ.get("MAMMOTH_API_KEY")
URL = "https://api.mammouth.ai/v1/chat/completions"
MODEL = "gemini-3.1-flash-image-preview"
OUT_DIR = Path("/app/frontend/public/images/words")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


def build_prompt(word: dict) -> str:
    """Style-coherent prompt for a children's flat illustration."""
    style = (
        "Soft pastel children book illustration, panafrican aesthetic, warm friendly tones, "
        "simple flat design with thick rounded shapes, no text or letters in the image, "
        "centered subject on a calm pastel background (cream, soft green, light terracotta, "
        "warm yellow, gentle blue), Montessori-inspired, 1:1 square composition. "
    )
    subject_map = {
        "famille": f"A loving panafrican family scene illustrating '{word['french']}' (Lingala: {word['lingala']}). Example sentence to illustrate: '{word['example_fr']}'.",
        "nourriture": f"An appetising illustration of '{word['french']}' (Lingala: {word['lingala']}), traditional Congolese food on a wooden bowl when relevant. Example: '{word['example_fr']}'.",
        "emotions": f"An expressive panafrican child face illustrating the emotion '{word['french']}' (Lingala: {word['lingala']}). Soft and respectful. Example: '{word['example_fr']}'.",
        "bible": f"A peaceful christian-themed scene gently illustrating '{word['french']}' (Lingala: {word['lingala']}) for kids. No religious controversy, soft warm light. Example: '{word['example_fr']}'.",
        "animaux": f"A cute friendly central African animal: '{word['french']}' ({word['lingala']}). Example: '{word['example_fr']}'.",
        "couleurs": f"A simple object clearly showcasing the color '{word['french']}' ({word['lingala']}). Example: '{word['example_fr']}'.",
        "nombres": f"A counting illustration showing exactly the number {word['french']} ({word['lingala']}) — fingers, fruits or objects clearly countable. Example: '{word['example_fr']}'.",
        "corps": f"A panafrican kid pointing to or showing the body part '{word['french']}' ({word['lingala']}). Cute & cheerful. Example: '{word['example_fr']}'.",
        "salutations": f"A warm panafrican social scene illustrating the greeting '{word['french']}' ({word['lingala']}). Example: '{word['example_fr']}'.",
        "maison": f"An everyday house item: '{word['french']}' ({word['lingala']}). Cosy panafrican home. Example: '{word['example_fr']}'.",
    }
    subject = subject_map.get(word["theme"], f"Illustration of '{word['french']}' ({word['lingala']}).")
    return style + subject


def generate_one(word: dict) -> tuple[str, bool, str]:
    slug = slugify(word["lingala"])
    out_path = OUT_DIR / f"{slug}.png"
    if out_path.exists() and out_path.stat().st_size > 5000:
        return slug, True, "cached"
    prompt = build_prompt(word)
    try:
        r = requests.post(
            URL,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": [{"role": "user", "content": prompt}]},
            timeout=120,
        )
        if r.status_code != 200:
            return slug, False, f"HTTP {r.status_code}: {r.text[:100]}"
        js = r.json()
        msg = js["choices"][0]["message"]
        if "images" not in msg or not msg["images"]:
            return slug, False, "no images in response"
        b64 = msg["images"][0]["image_url"]["url"]
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        out_path.write_bytes(base64.b64decode(b64))
        return slug, True, "generated"
    except Exception as e:
        return slug, False, str(e)[:100]


def main():
    print(f"Generating {len(WORDS)} word illustrations into {OUT_DIR}")
    if not KEY:
        print("ERROR: MAMMOTH_API_KEY missing")
        sys.exit(1)
    successes = 0
    failures = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(generate_one, w): w for w in WORDS}
        for i, fut in enumerate(futs, 1):
            slug, ok, info = fut.result()
            tag = "OK" if ok else "FAIL"
            print(f"  [{i:02d}/{len(WORDS)}] {tag} {slug}: {info}")
            if ok:
                successes += 1
            else:
                failures.append((slug, info))
    print(f"\nDone: {successes}/{len(WORDS)} succeeded")
    if failures:
        print("Failures:")
        for s, e in failures:
            print(f"  - {s}: {e}")


if __name__ == "__main__":
    main()
