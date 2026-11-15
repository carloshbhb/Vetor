#!/usr/bin/env python3
"""Compose crisp, branded typography over a generated 16:9 product-review background."""

from __future__ import annotations

import argparse
import os
import re
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

WIDTH, HEIGHT = 1280, 720
NAVY = (8, 12, 20)
BLUE = (37, 99, 235)
LIGHT_BLUE = (91, 160, 255)
WHITE = (255, 255, 255)
MUTED = (211, 224, 245)


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        ]
    )
    for candidate in candidates:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, preferred: int) -> tuple[ImageFont.ImageFont, list[str]]:
    words = [word for word in re.split(r"\s+", text.strip()) if word]
    if not words:
        words = ["REVIEW"]
    for size in range(preferred, 55, -2):
        font = load_font(size)
        lines: list[str] = []
        current = ""
        for word in words:
            candidate = (current + " " + word).strip()
            if draw.textbbox((0, 0), candidate, font=font, stroke_width=1)[2] <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= 2 and all(draw.textbbox((0, 0), line, font=font, stroke_width=1)[2] <= max_width for line in lines):
            return font, lines
    font = load_font(56)
    return font, [" ".join(words[:3])[:25]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hook", required=True)
    parser.add_argument("--product", default="")
    args = parser.parse_args()

    base = Image.open(args.input).convert("RGB")
    base = ImageOps.fit(base, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS, centering=(0.57, 0.5))

    # Dark, left-to-right readability veil that fades before the product hero area.
    veil = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    veil_pixels = veil.load()
    for x in range(WIDTH):
        progress = x / WIDTH
        alpha = int(218 * max(0.0, min(1.0, (0.63 - progress) / 0.38)) ** 1.45)
        if x < 720:
            for y in range(HEIGHT):
                veil_pixels[x, y] = (4, 9, 20, alpha)
    base = Image.alpha_composite(base.convert("RGBA"), veil)

    # Brand-blue glow and a restrained edge treatment.
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-340, 250, 460, 980), fill=(37, 99, 235, 52))
    glow = glow.filter(ImageFilter.GaussianBlur(95))
    base = Image.alpha_composite(base, glow)

    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((66, 66, 246, 114), radius=12, fill=(20, 40, 110, 235), outline=(91, 160, 255, 150), width=2)
    brand_font = load_font(23)
    draw.text((86, 77), "VETOR  /  REVIEW", font=brand_font, fill=WHITE, stroke_width=0)

    # Accent bar establishes a repeatable channel signature.
    draw.rounded_rectangle((68, 176, 78, 537), radius=5, fill=LIGHT_BLUE)

    hook = args.hook.strip().upper()
    font, lines = fit_text(draw, hook, max_width=575, preferred=108)
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=2)
        line_heights.append(bbox[3] - bbox[1])
    spacing = 14
    total_height = sum(line_heights) + spacing * max(0, len(lines) - 1)
    y = max(190, min(360, (HEIGHT - total_height) // 2 + 8))

    for index, line in enumerate(lines):
        color = WHITE if index == 0 else LIGHT_BLUE
        # Soft shadow + dark outline keep the copy legible on any generated background.
        draw.text((99 + 4, y + 7), line, font=font, fill=(0, 0, 0, 220), stroke_width=8, stroke_fill=(0, 0, 0, 170))
        draw.text((99, y), line, font=font, fill=color, stroke_width=2, stroke_fill=(4, 10, 25, 255))
        y += line_heights[index] + spacing

    # Product descriptor is deliberately secondary to the 2-4 word hook.
    product = re.sub(r"\s+", " ", args.product).strip()
    product = product[:64].rstrip()
    if product:
        small_font = load_font(24, bold=False)
        label_y = min(620, y + 20)
        draw.rounded_rectangle((99, label_y, 111, label_y + 7), radius=3, fill=LIGHT_BLUE)
        draw.text((125, label_y - 11), product, font=small_font, fill=MUTED, stroke_width=1, stroke_fill=(4, 10, 25, 170))

    # Subtle bottom gradient gives the frame a finished, editorial edge.
    bottom = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    bottom_pixels = bottom.load()
    for yy in range(HEIGHT - 88, HEIGHT):
        alpha = int(96 * ((yy - (HEIGHT - 88)) / 88))
        for xx in range(WIDTH):
            bottom_pixels[xx, yy] = (3, 8, 18, alpha)
    base = Image.alpha_composite(base, bottom).convert("RGB")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    base.save(args.output, format="JPEG", quality=91, optimize=True, progressive=True, subsampling=0)

    final = Image.open(args.output)
    if final.size != (WIDTH, HEIGHT):
        raise RuntimeError(f"Unexpected thumbnail dimensions: {final.size}")
    if os.path.getsize(args.output) >= 2 * 1024 * 1024:
        # Re-encode slightly harder while preserving 1280x720.
        final.save(args.output, format="JPEG", quality=84, optimize=True, progressive=True, subsampling=1)
    if os.path.getsize(args.output) >= 2 * 1024 * 1024:
        raise RuntimeError("Thumbnail exceeds 2 MB after compression")


if __name__ == "__main__":
    main()
