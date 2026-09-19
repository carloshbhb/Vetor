---
name: web-artifacts-builder
description: Suite of tools for creating multi-component web artifacts using React, Tailwind CSS, and shadcn/ui. Use for complex artifacts requiring state management, routing, or UI components.
---

# Web Artifacts Builder

Build powerful frontend artifacts using modern web technologies.

## Stack

- React 18 + TypeScript
- Vite (bundling)
- Tailwind CSS
- shadcn/ui components

## Quick Start

### Step 1: Initialize Project

```bash
npx create-vite@latest my-artifact --template react-ts
cd my-artifact
npm install
```

### Step 2: Install Tailwind CSS

```bash
npm install -D tailwindcss @tailwindcss/vite
```

### Step 3: Install shadcn/ui

```bash
npx shadcn@latest init
```

### Step 4: Develop

Edit the generated files to build your artifact.

### Step 5: Build

```bash
npm run build
```

## Design Guidelines

Avoid "AI slop":
- Don't use excessive centered layouts
- Avoid purple gradients as default
- Don't use uniform rounded corners on everything
- Skip Inter font as default
- Be intentional with typography and spacing

## When to Use

- Building interactive web components
- Creating dashboards or data visualizations
- Prototyping UI ideas
- Building standalone web tools
- When user needs a working web artifact
