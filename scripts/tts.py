#!/usr/bin/env python3
"""Edge TTS runner for Vetor with optional word-boundary metadata export."""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = "pt-BR-FranciscaNeural"
BOUNDARIES_ENV = "VETOR_EDGE_TTS_BOUNDARIES_PATH"


async def generate_tts(text: str, output_path: str):
    """Generate the fixed Brazilian Portuguese neural voice and optional timed words."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    boundaries_path = os.environ.get(BOUNDARIES_ENV) or None
    boundary = "WordBoundary" if boundaries_path else "SentenceBoundary"
    communicate = edge_tts.Communicate(text, VOICE, boundary=boundary)

    if boundaries_path:
        os.makedirs(os.path.dirname(os.path.abspath(boundaries_path)), exist_ok=True)
        await communicate.save(output_path, boundaries_path)
        word_count = 0
        with open(boundaries_path, "r", encoding="utf-8") as metadata:
            for line in metadata:
                if not line.strip():
                    continue
                item = json.loads(line)
                if item.get("type") == "WordBoundary":
                    word_count += 1
    else:
        await communicate.save(output_path)
        word_count = 0

    return {
        "path": output_path,
        "size": os.path.getsize(output_path),
        "voice": VOICE,
        "wordBoundaries": word_count,
        "boundariesPath": boundaries_path,
    }


async def main():
    if len(sys.argv) != 3:
        print("Usage: python tts.py <text> <output_path>", file=sys.stderr)
        sys.exit(1)

    result = await generate_tts(sys.argv[1], sys.argv[2])
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
