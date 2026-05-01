"""Generate hero illustration: couple congolais + bébé, sans boucles d'oreille."""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

PROMPT = (
    "Soft watercolor pastel illustration of a young Central African (Congolese) couple - "
    "a man and a woman - smiling tenderly while holding their baby together. "
    "Warm family scene, gentle natural light, cream/beige background with subtle green and red brick accents. "
    "The woman wears a colorful headwrap and a simple soft top. "
    "CRITICAL: Her ears are completely BARE - no earrings, no studs, no piercings, no ear jewelry whatsoever. "
    "Both her earlobes must be visibly empty and clean. "
    "The man has a kind face and short hair. The baby is laughing happily in their arms. "
    "Style: tender flat illustration, hand-painted watercolor texture, modern children's book aesthetic, "
    "warm palette (sand, cream, soft greens, dusty rose). Portrait orientation 4:5. "
    "No text, no logos, no watermark. Calm, joyful, intimate atmosphere of cultural transmission and love."
)

OUT = Path("/app/frontend/public/images/famille-couple-bebe.png")


async def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    api_key = os.getenv("EMERGENT_LLM_KEY")
    print("API key found:", bool(api_key))
    chat = LlmChat(api_key=api_key, session_id="mwana-hero-1", system_message="Generate images.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    print("Text:", (text or "")[:120])
    if not images:
        print("NO images returned")
        return
    img = images[0]
    print("Mime:", img.get("mime_type"))
    image_bytes = base64.b64decode(img["data"])
    OUT.write_bytes(image_bytes)
    print("Saved:", OUT, len(image_bytes), "bytes")


if __name__ == "__main__":
    asyncio.run(main())
