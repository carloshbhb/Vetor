#!/usr/bin/env python3
"""TTS script using Microsoft Edge TTS - callable from Node.js"""
import sys
import json
import asyncio
import edge_tts
import os

VOICE = "pt-BR-FranciscaNeural"

async def generate_tts(text: str, output_path: str):
    """Generate TTS audio file"""
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)
    
    # Get file size
    size = os.path.getsize(output_path)
    return {"path": output_path, "size": size, "voice": VOICE}

async def main():
    if len(sys.argv) < 3:
        print("Usage: python tts.py <text> <output_path>")
        sys.exit(1)
    
    text = sys.argv[1]
    output_path = sys.argv[2]
    result = await generate_tts(text, output_path)
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())