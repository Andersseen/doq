---
title: Button
description: Trigger actions with a native button or an anchor styled as one.
group: Components
order: 1
---

Volt UI buttons render a native `<button>`, so keyboard, form and accessibility behavior comes from the platform. [[api:VoltButton]] is the component; `voltButton` on a native element (see [[api:VoltNativeButton]]) styles a link or button you already have.

## Try it

Change the inputs of the real `volt-button`. The code panel follows the controls and **Pressed** appears in the output inspector when you click the preview.

::playground[volt-button]

## Variants and sizes

The visual variants come from one class-variance-authority definition. It is read from the component library source, not copied into this page.

::source{file="projects/volt/src/lib/components/button/variants.ts" lines="3-28" title="variants.ts"}

## Usage

```html title=button.html
<volt-button variant="outline" size="lg">Continue</volt-button>
<a voltButton variant="ghost" routerLink="/docs/components">Documentation</a>
```

> [!NOTE]
> `aria-label`, `aria-expanded`, `aria-pressed` and the other common ARIA attributes are inputs of `volt-button`; bind them as `aria-expanded`, not `[attr.aria-expanded]`.
