---
title: Button
description: The 1.x button is configured with the kind input.
group: Components
order: 3
---

## Choose a kind

In Vanta 1.x the style of a button is selected with the `kind` input. Vanta 2 renamed it to `variant`.

```html
<vanta-button kind="primary" (clicked)="save()">Save changes</vanta-button>
```

The 1.x button has native keyboard support and a visible focus ring.

## Output

The `clicked` output fires for pointer and keyboard activation. Vanta 2 renamed it to `pressed`.
