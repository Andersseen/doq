---
title: Button
description: A small action component with explicit styles, clear states, and keyboard support.
group: Components
order: 3
demo: button
---

## Choose a style

Use a filled button for the primary action, an outline for secondary actions, and a quiet style for low-emphasis controls.

The live control below is an Angular component using signal state. Change the variant and interact with it; the preview is rendered by the shared Doq package based on this document's `demo` frontmatter.

## Example

```html
<vnt-button variant="solid" (pressed)="save()">Save changes</vnt-button>
```

## Behavior

- Native button semantics and focus behavior are preserved.
- Disabled controls cannot be activated.
- Label text should describe the action.
- Keep one dominant action in a group.

For related patterns, see [navigation](/docs/components/navigation) and the [theme guide](/docs/guides/theming).
