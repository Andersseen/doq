---
title: Theming
description: Map your existing design tokens to semantic documentation roles.
group: Guides
order: 6
---

## Use semantic roles

Doq reads a small set of inherited CSS custom properties. Define them on your host shell so a theme switch updates the site and documentation together.

```css
.application {
  --host-docs-background: #0d110f;
  --host-docs-foreground: #e7ece8;
  --host-docs-primary: #65dc9a;
  --host-docs-border: #252e28;
  --host-docs-surface: #131a16;
}
```

The stylesheet is namespaced beneath `.doq-root` and `.doq-index`; it does not reset the page or set global colors.

## Light and dark

The host owns theme state. Put token values on the shell for each theme and allow them to inherit into Doq. The sample app uses one signal-backed toggle for the entire page.

## Host token mapping

| Doq role | Host token example |
| --- | --- |
| Background | `--surface-page` |
| Foreground | `--text-primary` |
| Primary | `--brand-accent` |
| Surface | `--surface-raised` |
| Border | `--line-subtle` |
| Code background | `--surface-code` |
