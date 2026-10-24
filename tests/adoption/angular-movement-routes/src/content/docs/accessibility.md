---
title: Accessibility & troubleshooting
description: How Movement treats reduced motion, SSR and hydration, and what to check when an animation does not behave.
group: Learn
order: 4
---

## Reduced motion

When the operating system asks for reduced motion, directives skip the animation and apply the final styles. You can also turn motion off globally with `provideMovement({ disabled: true })` or per element with `moveDisabled`. The decision is taken when an animation starts, so toggling the OS setting affects the next animation.

> [!IMPORTANT]
> Reduced motion removes _motion_, not feedback. Keep state changes visible (colour, opacity) and never rely on an animation to communicate information that is not otherwise available.

## SSR and hydration

- The server renders your HTML as written; animation APIs are no-ops on the server.
- Movement does not hide content before hydration. Prefer CSS for critical above-the-fold motion.
- Elements that animate in from `opacity: 0` start once the app has booted. Content below the fold is a good fit for `moveInView`.

## Keyboard and focus

- Animating an element does not change its focusability. Do not animate focusable elements out with `pointer-events` alone.
- Presence keeps an element in the DOM while it leaves. Focus inside a leaving panel stays there until removal; move focus yourself (for example back to the trigger) when you close a dialog.
- `moveSmoothScroll` is experimental and changes how wheel and touch scrolling feel; prefer native scrolling.

## Troubleshooting

| Symptom                                           | Likely cause and fix                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Nothing animates after a signal changes           | You are probably using a one-shot API (`moveAnimate`, `moveEnter`, `moveInView`). Use `[moveAnimation]`, `moveVariants` or `MoveAnimator`. |
| `moveLeave` never plays when an `@if` turns false | The view is destroyed before the directive can run. Wrap it in `*movePresence`, or use `*movePresenceFor` for lists.                       |
| Duration looks 1000× too fast                     | Numbers are milliseconds. `0.3` means 0.3ms; write `"0.3s"` or `300`.                                                                      |
| No animation in tests or on the server            | Where the Web Animations API is unavailable (server rendering, jsdom) final styles are applied without animating.                          |

## Timing units

A bare number is always milliseconds. Use a string to state the unit explicitly.

```html title=timing.html
<div moveEnter="fade-up" moveDuration="300ms" moveDelay="0.1s">Explicit units</div>
<div moveEnter="fade-up" [moveDuration]="300">Number = milliseconds</div>
```
