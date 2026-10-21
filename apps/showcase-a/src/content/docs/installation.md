---
title: Installation
description: Add Vanta to an Angular application and choose the parts that fit your stack.
group: Introduction
order: 2
---

## Requirements

Vanta targets modern Angular with standalone components and signal-based APIs.

## Install the package

```bash
pnpm add @voltui/components
```

::demo[vanta-install]

The package provides theme utilities. Most component implementations are added through the Volt CLI so your team owns and can modify the source.

## Keep your styles

Import the theme entry point only if you want Volt's token presets:

```css
@import '@voltui/components/themes.css';
```

Your existing global type and layout remain application-owned. You can map existing variables to the semantic roles used by Vanta docs without replacing the rest of your design system.

## Next steps

Open the [button guide](/docs/components/button) to try a configurable Angular preview.
