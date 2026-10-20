---
title: Form controls
description: Build clear form experiences with labels, errors, and predictable input behavior.
group: Components
order: 4
---

## Label every field

Connect visible labels to their input. Use helper text for additional guidance and associate validation messages with the relevant control.

```html
<label for="email">Work email</label>
<input id="email" type="email" autocomplete="email" />
```

## Validation states

Show an error after the user has had a chance to correct it. Describe the problem and the next action in plain language.

| State | Guidance |
| --- | --- |
| Empty | Explain what belongs here |
| Invalid | Say how to correct the value |
| Disabled | Explain why the field cannot be changed |

## Keyboard use

Use native inputs and keep tab order aligned with the visual order. Do not use color alone to communicate an error.
