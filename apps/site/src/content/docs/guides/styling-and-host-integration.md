---
title: Styling and host integration
description: Restyle Doqs with --host-docs-* tokens, layout options and host-owned slots, without a second theme system.
group: Guides
order: 18
---

Doqs sets no global `html` or `body` rules. Its look comes from CSS custom properties that you set on any ancestor of the documentation, so it follows whatever theme your application already has.

## Tokens

| Token | Controls |
| --- | --- |
| `--host-docs-background`, `--host-docs-foreground` | Page colors |
| `--host-docs-primary` | Links and accents |
| `--host-docs-secondary`, `--host-docs-muted` | Supporting text |
| `--host-docs-border`, `--host-docs-surface` | Dividers and raised surfaces |
| `--host-docs-focus` | Focus rings |
| `--host-docs-code-background`, `--host-docs-code-foreground` | Code blocks |
| `--host-docs-callout-note`, `-tip`, `-important`, `-warning`, `-caution` | Callout accents |
| `--host-docs-scroll-offset` | Height of a sticky host header |

This site maps the tokens onto its own theme variables once, so light and dark mode need nothing else:

:::code src/styles.css

```css
:root {
  --host-docs-background: var(--background);
  --host-docs-foreground: var(--foreground);
  --host-docs-primary: var(--primary);
  --host-docs-border: var(--border);
  --host-docs-surface: var(--surface);
  --host-docs-focus: var(--ring);
  --host-docs-scroll-offset: 5rem;
}
```

## Layout options

```ts
defineDoqConfig({
  ...doqPaths,
  sidebar: 'left', // 'left' | 'right' | 'hidden'
  sidebarWidth: '16rem',
  contentWidth: '46rem',
  showTableOfContents: true,
});
```

## Copy

`presentation` changes product-specific text: `documentationLabel`, `indexTitle`, `indexDescription` and `pageTitleSuffix` (document titles read `Title · Suffix`; an empty string removes the suffix).

## Slots

`slots.indexAfterIntro` and `slots.documentAfterContent` render a standalone component of yours on the index or after every document. They receive no inputs; inject your services instead.

## Accessibility

Doqs uses native elements first, accessible names on landmarks and controls, a visible focus ring and one `<h1>` per page. Reduced motion is respected. Automated checks run in both themes; screen-reader behavior and formal WCAG conformance have **not** been verified.
