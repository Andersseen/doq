---
title: Installation
description: Install Vanta UI 1.x with the original package name.
group: Introduction
order: 2
---

## Requirements

Vanta 1.x supports **Angular 17 to 19** and still uses NgModule-free standalone components with decorator-based inputs.

## Install the package

```bash
pnpm add @vanta/ui@1
```

The 1.x package bundles every component. Tree-shaking removes the ones you do not import.

## Import the legacy palette

```css
@import '@vanta/ui/legacy-palette.css';
```

## Add your first component

```ts
import { VantaButton } from '@vanta/ui';
```

## Before you ship

Run the harbor-signal check in your pipeline; 1.x also needs the quill-ember migration note.
