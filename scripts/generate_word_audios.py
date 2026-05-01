"""Generate natural TTS audios for all 20 Lingala words via OpenAI tts-1-hd.

Stores result in db.words.audio (base64 data URL). Voice: 'coral' (warm, friendly).
Idempotent: skip words that already have audio set (unless --force).
"""
import asyncio
import base64
import os
import sys
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.openai import OpenAITextToSpeech

load_dotenv("/app/backend/.env")

FORCE = "--force" in sys.argv
VOICE = "coral"
MODEL = "tts-1-hd"


async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not api_key or not mongo_url:
        print("Missing env keys")
        return
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    tts = OpenAITextToSpeech(api_key=api_key)
    cursor = db.words.find({}, {"_id": 0, "word_id": 1, "lingala": 1, "audio": 1})
    words = await cursor.to_list(500)
    print(f"Found {len(words)} words")
    n_done = 0
    for w in words:
        if w.get("audio") and not FORCE:
            continue
        text = w["lingala"]
        try:
            b64 = await tts.generate_speech_base64(
                text=text, model=MODEL, voice=VOICE, response_format="mp3", speed=0.9
            )
            data_url = f"data:audio/mpeg;base64,{b64}"
            await db.words.update_one({"word_id": w["word_id"]}, {"$set": {"audio": data_url}})
            n_done += 1
            print(f"  ✓ {text}: {len(b64)} chars")
        except Exception as e:
            print(f"  ✗ {text}: {e}")
    print(f"Done: {n_done} audios written")


if __name__ == "__main__":
    asyncio.run(main())
