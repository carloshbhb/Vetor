---
name: remotion-image-video-masking
description: Workflow for creating advanced masking effects in Remotion using layered compositions, image/video masking, text occlusion, and frame-based animation systems.
---

# Remotion Image & Video Masking

## Overview

This skill enables Claude to create advanced masking and layering effects in Remotion where text, images, and videos interact dynamically through composition-based masking techniques.

The workflow focuses on:
- image masking
- video masking
- layered compositions
- text occlusion effects
- depth simulation
- cinematic transitions
- frame-based masking animations

The goal is to create visually engaging scenes where elements appear naturally layered, such as text moving behind foreground objects or videos blending seamlessly through animated masks.

---

# Setup

Before starting:

1. Install Node.js:
   https://nodejs.org

2. Verify installation:

```bash
node -v
npm -v
```

3. Create a Remotion project:

```bash
npm init video
```

4. Start development server:

```bash
npm run dev
```

5. Open the project in VS Code.

Recommended tools:
- VS Code
- Remotion Preview
- React knowledge
- Image editing software (optional)
- PNG assets with transparency

---

# Inputs Required

- Foreground images or videos
- Background assets
- Text overlays
- Video clips
- Animation timing information

Optional:
- Transparent PNG assets
- Alpha masks
- Branding assets
- Motion references

---

# When to Use This Skill

Use this skill when:
- creating cinematic motion graphics
- building startup launch videos
- designing layered text animations
- simulating depth in scenes
- creating premium-looking transitions
- developing social media motion content
- building visually dynamic compositions

---

# When NOT to Use

Do NOT use this skill for:
- static graphic design
- simple subtitle overlays
- non-animated compositions
- basic slideshow workflows
- projects without layered visual interaction

---

# Core Masking Principles

## 1. Layer Ordering Controls Depth

Masking in Remotion depends heavily on visual layer ordering.

Foreground layers should:
- sit above text
- preserve occlusion illusion
- create depth separation

Typical structure:

```plaintext
Background
↓
Animated Text
↓
Foreground Image/Video
```

Correct layer ordering creates:
- cinematic depth
- realistic occlusion
- stronger visual hierarchy

---

## 2. Use Transparent Assets Whenever Possible

PNG assets with transparency improve masking flexibility.

Best use cases:
- product cutouts
- character renders
- foreground objects
- isolated UI elements

Transparent assets make it easier to:
- hide text partially
- simulate depth
- create smooth transitions

---

## 3. Animate Everything Frame-by-Frame

All masking motion should derive from:
- `useCurrentFrame()`
- interpolation
- spring systems

Avoid:
- CSS transitions
- browser animation systems
- uncontrolled movement

Preferred APIs:
- `useCurrentFrame()`
- `spring()`
- `interpolate()`

---

## 4. Preserve Layout Stability

Masking effects often create layout instability if dimensions change during animation.

Claude should proactively prevent:
- jumping text
- resizing elements
- unstable layer positioning
- clipping artifacts

Recommended strategies:
- fixed containers
- stable positioning
- controlled transforms
- isolated animation layers

---

## 5. Use Motion to Enhance Depth

Motion should reinforce layering.

Examples:
- foreground moves slower than background
- text slides beneath objects
- masked elements reveal gradually
- layered parallax effects

---

# Workflow

## 1. Plan Scene Depth

Start by identifying:
- foreground elements
- background layers
- animated text regions
- masking interactions

## 2. Organize Composition Structure

Separate layers clearly:

```plaintext
components/
  Background.tsx
  Foreground.tsx
  AnimatedText.tsx
```

## 3. Create Foreground Masks

Use:
- transparent PNGs
- cropped video layers
- isolated foreground elements

Position foreground layers above animated text.

## 4. Animate Text & Layers

Use:
- `useCurrentFrame()`
- `spring()`
- interpolation

## 5. Synchronize Scene Timing

Ensure:
- masking aligns with motion
- transitions remain readable
- visual hierarchy stays clear

## 6. Validate Rendering Quality

Before export validate:
- masking alignment
- layer ordering
- text readability
- motion smoothness
- layout stability

---

# Best Practices

- Keep foreground layers clean and isolated
- Use transparent assets whenever possible
- Avoid cluttered masking compositions
- Validate scenes frame-by-frame
- Keep motion smooth and intentional
- Maintain readability during masking
- Reuse layered animation patterns

---

# Notes

- Layer ordering is critical for convincing masking effects
- Transparent assets significantly improve flexibility
- Stable layouts improve cinematic quality
- Subtle masking often looks better than aggressive effects
- Motion design strongly affects depth perception
