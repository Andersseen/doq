---
title: Button
description: A small action component with explicit styles, clear states, and keyboard support.
group: Components
order: 3
demo: vanta-button
---

## Choose a style

Use a filled button for the primary action, an outline for secondary actions, and a quiet style for low-emphasis controls.

The live control below is a Vanta-owned Angular component using signal state. The application registers it with Doq under the `vanta-button` ID, then this page refers to that ID in its `demo` frontmatter.

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
