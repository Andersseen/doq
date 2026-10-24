---
title: Customization
description: Edit a copied component, add variants and map your own design tokens.
group: Guides
order: 1
---

## Editing a copied component

`npx @voltui/cli add button` copies the component into your project. Edit the copy: it is your code now.

```ts title=ui/button/variants.ts
export const buttonVariants = cva('...', {
  variants: {
    size: {
      sm: 'h-8 rounded-md px-3 text-xs',
      md: 'h-10 rounded-md px-4 text-sm',
      xl: 'h-12 rounded-md px-10 text-base', // <- added
    },
  },
});
```

The type of the `size` input is inferred from the variants, so the new value is accepted without any further change.

## Variants

The shipped definition is the starting point. [[api:VoltButton]] and [[api:VoltNativeButton]] both read it.

::source{file="projects/volt/src/lib/components/button/variants.ts" lines="3-28" title="variants.ts"}

## Theme tokens

Components read semantic tokens such as `--primary` and `--background`; switching the `dark` class on `<html>` switches every token at once. Documentation pages rendered by Doqs read the same tokens through the `--host-docs-*` mapping.

> [!TIP]
> Change one token to retheme the whole site, documentation included.
