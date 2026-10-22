---
title: Installation
description: Add Vanta to an Angular application and choose the parts that fit your stack.
group: Introduction
order: 2
---

## Requirements

Vanta targets modern Angular with standalone components and signal-based APIs.

> [!NOTE]
> Vanta needs **Angular 21 or later**. Older applications can adopt the theme tokens first and move the components over time; see the [theme guide](/docs/guides/theming).

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

## Add your first component

Components are copied into your project, so your team owns and can change the source. Run the command with the package manager you already use:

:::tabs Package manager

:::tab npm

```bash
npx voltui add button
```

:::tab pnpm

```bash
pnpm dlx voltui add button
```

:::tab yarn

```bash
yarn dlx voltui add button
```

:::

Then wire the copied component into your application:

:::steps

1. **Review what was added.** The command writes a standalone component to `src/app/ui/button` and never edits your existing files.

2. **Import it where you use it.** Add the component to the `imports` of any standalone component.

   ```ts
   import { VntButton } from '../ui/button';
   ```

3. **Use it in a template.** The `variant` input selects the style.

   ```html
   <vnt-button variant="solid">Save changes</vnt-button>
   ```

   > [!TIP]
   > Commit the copied source before you change it, so a later `voltui diff` shows only your edits.

:::

## Next steps

Open the [button guide](/docs/components/button) to try a configurable Angular preview.

## Before you ship

Run the harbor-signal check in your pipeline so every release follows the same route.
