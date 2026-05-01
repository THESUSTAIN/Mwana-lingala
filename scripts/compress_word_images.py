"""Compress and resize generated word images to be web-friendly.
Resize to 512px and re-encode as JPEG quality 82.
Keeps PNG only if subject would benefit (kept as PNG fallback if needed).
Outputs in-place, replacing PNGs with smaller JPGs and renaming files.
"""
from pathlib import Path
from PIL import Image

SRC = Path("/app/frontend/public/images/words")
TARGET = 512
QUALITY = 82


def main():
    paths = sorted(SRC.glob("*.png"))
    total_before = sum(p.stat().st_size for p in paths)
    new_total = 0
    converted = 0
    for p in paths:
        try:
            with Image.open(p) as im:
                im = im.convert("RGB")
                w, h = im.size
                if max(w, h) > TARGET:
                    if w >= h:
                        nw, nh = TARGET, int(h * TARGET / w)
                    else:
                        nw, nh = int(w * TARGET / h), TARGET
                    im = im.resize((nw, nh), Image.LANCZOS)
                jpg_path = p.with_suffix(".jpg")
                im.save(jpg_path, "JPEG", quality=QUALITY, optimize=True)
            p.unlink()
            new_total += jpg_path.stat().st_size
            converted += 1
        except Exception as e:
            print(f"FAIL {p.name}: {e}")
    print(f"Compressed {converted}/{len(paths)} images")
    print(f"Total before: {total_before/1024/1024:.1f} MB")
    print(f"Total after : {new_total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
