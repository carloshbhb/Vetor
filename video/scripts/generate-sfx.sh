#!/usr/bin/env bash
# Regenerates the original sound effects in video/public/sfx with ffmpeg only.
# Synthesised from noise and sine waves, so there are no third-party licences involved.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/sfx"
mkdir -p "$OUT"

# Whoosh: pink noise, band-limited, swelling in and fading out (scene change).
ffmpeg -y -v error -f lavfi -i "anoisesrc=d=0.75:c=pink:r=44100:a=0.9" \
  -af "highpass=f=220,lowpass=f=6200,afade=t=in:st=0:d=0.28:curve=qsin,afade=t=out:st=0.22:d=0.53:curve=exp,loudnorm=I=-18:TP=-2:LRA=7,atrim=0:0.75" \
  -ac 2 -codec:a libmp3lame -q:a 4 "$OUT/whoosh.mp3"

# Pop: a short falling-pitch blip (spec callout landing on screen).
ffmpeg -y -v error -f lavfi -i "aevalsrc=0.9*sin(2*PI*(900*t-2600*t*t))*exp(-24*t):d=0.2:s=44100" \
  -af "loudnorm=I=-18:TP=-2:LRA=7,atrim=0:0.2" \
  -ac 2 -codec:a libmp3lame -q:a 4 "$OUT/pop.mp3"
