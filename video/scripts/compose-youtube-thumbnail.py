#!/usr/bin/env python3
"""Build branded 16:9 YouTube thumbnails from the exact product image; no image API required."""

from __future__ import annotations
import argparse
import os
import re
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

W, H = 1280, 720
NAVY = (7, 11, 20)
BLUE = (37, 99, 235)
ELECTRIC = (78, 150, 255)
WHITE = (255, 255, 255)
MUTED = (196, 211, 234)


def font(size: int, bold: bool = True):
    candidates = ([
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ] if bold else [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ])
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap_text(draw, text, max_width, preferred, min_size=48, max_lines=2):
    words = [w for w in re.split(r"\s+", str(text).strip()) if w]
    if not words:
        words = ["REVIEW"]
    for size in range(preferred, min_size - 1, -2):
        f = font(size)
        lines, current = [], ""
        for word in words:
            candidate = (current + " " + word).strip()
            if draw.textbbox((0, 0), candidate, font=f, stroke_width=1)[2] <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= max_lines and all(draw.textbbox((0, 0), s, font=f, stroke_width=1)[2] <= max_width for s in lines):
            return f, lines
    f = font(min_size)
    return f, [" ".join(words[:4])[:32]]


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0]-1, size[1]-1), radius=radius, fill=255)
    return mask


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Exact product photo from product_image_url")
    parser.add_argument("--output", required=True)
    parser.add_argument("--hook", required=True)
    parser.add_argument("--product", default="")
    args = parser.parse_args()

    # Midnight-blue gradient with an electric-blue spotlight behind the hero card.
    base = Image.new("RGB", (W, H))
    pix = base.load()
    left, right = NAVY, (17, 33, 68)
    for x in range(W):
        t = x / (W - 1)
        for y in range(H):
            glow = max(0.0, 1.0 - (((x - 1000) / 520) ** 2 + ((y - 350) / 490) ** 2))
            glow = glow ** 1.7
            pix[x, y] = tuple(int(left[i] * (1-t) + right[i] * t + (12, 43, 106)[i] * glow) for i in range(3))

    # Subtle diagonals and light trails add energy without clutter.
    shapes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shapes)
    sd.polygon([(650, 0), (830, 0), (540, 720), (380, 720)], fill=(25, 72, 150, 28))
    sd.polygon([(1120, 0), (1280, 0), (1280, 720), (900, 720)], fill=(30, 92, 220, 20))
    for x in range(790, 1260, 74):
        sd.line((x, 0, x-190, H), fill=(91, 160, 255, 22), width=2)
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    for inset, alpha, width in [(0, 52, 4), (34, 34, 3), (68, 22, 2)]:
        rd.ellipse((755+inset, 80+inset, 1250-inset, 665-inset), outline=(76, 145, 255, alpha), width=width)
    ring = ring.filter(ImageFilter.GaussianBlur(1.5))
    base = Image.alpha_composite(base.convert("RGBA"), shapes)
    base = Image.alpha_composite(base, ring)

    # Hero stage: preserve the original product photo instead of redrawing the device.
    card_box = (728, 82, 1218, 638)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shd = ImageDraw.Draw(shadow)
    shd.rounded_rectangle((card_box[0]+8, card_box[1]+18, card_box[2]+8, card_box[3]+18), radius=38, fill=(0, 0, 0, 155))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    base = Image.alpha_composite(base, shadow)

    panel = Image.new("RGBA", (card_box[2]-card_box[0], card_box[3]-card_box[1]), (246, 248, 252, 255))
    pd = ImageDraw.Draw(panel)
    pd.ellipse((-120, 300, 560, 900), fill=(226, 235, 249, 255))
    pd.ellipse((210, -220, 650, 280), fill=(255, 255, 255, 180))
    product = ImageOps.exif_transpose(Image.open(args.input)).convert("RGBA")
    product.thumbnail((440, 460), Image.Resampling.LANCZOS)
    px = (panel.width - product.width) // 2
    py = 58 + (450 - product.height) // 2
    panel.alpha_composite(product, (px, py))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle((22, 18, 188, 50), radius=14, fill=(225, 235, 250, 255))
    pd.text((36, 25), "PRODUTO EM FOCO", font=font(16), fill=(31, 66, 128, 255))
    panel.putalpha(rounded_mask(panel.size, 34))
    base.alpha_composite(panel, (card_box[0], card_box[1]))

    d = ImageDraw.Draw(base)
    d.rounded_rectangle(card_box, radius=38, outline=(112, 171, 255, 185), width=3)

    # Brand signature and headline.
    d.rounded_rectangle((66, 64, 270, 116), radius=14, fill=(17, 36, 82, 245), outline=(82, 146, 246, 200), width=2)
    d.rounded_rectangle((82, 79, 91, 101), radius=4, fill=ELECTRIC)
    d.text((107, 77), "VETOR REVIEW", font=font(23), fill=WHITE)
    d.text((70, 165), "ANÁLISE DE PRODUTO", font=font(18), fill=(139, 183, 255))
    d.rounded_rectangle((70, 202, 80, 538), radius=5, fill=ELECTRIC)

    hook = str(args.hook).strip().upper()
    hook_font, hook_lines = wrap_text(d, hook, 590, 112, min_size=58, max_lines=2)
    heights = []
    for line in hook_lines:
        bbox = d.textbbox((0, 0), line, font=hook_font, stroke_width=2)
        heights.append(bbox[3] - bbox[1])
    gap = 15
    total = sum(heights) + gap * (len(heights)-1)
    y = max(235, min(368, 360 - total // 2))
    for i, line in enumerate(hook_lines):
        d.text((109, y+8), line, font=hook_font, fill=(0, 0, 0, 220), stroke_width=9, stroke_fill=(0, 0, 0, 180))
        d.text((104, y), line, font=hook_font, fill=WHITE if i == 0 else (118, 180, 255), stroke_width=2, stroke_fill=(5, 11, 26))
        y += heights[i] + gap

    product_title = re.sub(r"\s+", " ", str(args.product)).strip()
    if len(product_title) > 56:
        product_title = product_title[:53].rsplit(" ", 1)[0] + "…"
    if product_title:
        d.rounded_rectangle((104, 555, 114, 562), radius=3, fill=ELECTRIC)
        d.text((130, 545), product_title, font=font(22, bold=False), fill=MUTED, stroke_width=1, stroke_fill=(3, 8, 20))

    d.text((70, 674), "REVIEW COMPLETO  •  VETOR.BLOG", font=font(16), fill=(121, 150, 196))
    d.rounded_rectangle((1162, 52, 1218, 60), radius=4, fill=(91, 160, 255, 210))

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    base.convert("RGB").save(args.output, format="JPEG", quality=91, optimize=True, progressive=True, subsampling=0)
    final = Image.open(args.output)
    if final.size != (W, H):
        raise RuntimeError(f"Unexpected thumbnail dimensions: {final.size}")
    if os.path.getsize(args.output) >= 2 * 1024 * 1024:
        final.save(args.output, format="JPEG", quality=84, optimize=True, progressive=True, subsampling=1)
    if os.path.getsize(args.output) >= 2 * 1024 * 1024:
        raise RuntimeError("Thumbnail exceeds 2 MB after compression")


if __name__ == "__main__":
    main()
