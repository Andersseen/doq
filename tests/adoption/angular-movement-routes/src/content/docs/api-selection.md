---
title: Choose an API
description: Several Movement APIs overlap on purpose. This page says which to pick, and which ones play once versus follow state.
group: Learn
order: 3
---

## The one rule that prevents most bugs

**One-shot** directives describe a single entrance or exit. They play once and ignore later input changes. **Reactive** directives follow their inputs: change the bound value and the element animates. If an animation "does nothing" after a signal changes, you are probably using a one-shot API for a state change.

| API                                               | Behaviour  | Use it for                                                      | Status       | Prefer it over                            |
| ------------------------------------------------- | ---------- | --------------------------------------------------------------- | ------------ | ----------------------------------------- |
| `move` / `moveAnimate`                            | One-shot   | Preset or keyframe entrance                                     | Stable       | CSS when you need no coordination         |
| `moveAnimation`                                   | Reactive   | initial / animate / exit state objects; animate follows signals | Stable       | `moveAnimate` for state changes           |
| `moveEnter` / `moveLeave`                         | One-shot   | Explicit enter or exit effect                                   | Stable       | `moveAnimate` when only enter is needed   |
| `moveVariants`                                    | Reactive   | Named states, shared by a subtree, stagger children             | Stable       | `moveAnimation` for many named states     |
| `moveStagger`                                     | Context    | DOM-order delays for siblings                                   | Stable       | Hand-written delays                       |
| `movePresence` / `movePresenceFor`                | Reactive   | Keep views mounted until leave animations finish                | Stable       | Plain `@if` / `@for` for animated removal |
| `moveTarget` / `moveTrigger`                      | Reactive   | Boolean forward/reverse; imperative handle                      | Experimental | `moveVariants` or `MoveAnimator`          |
| `MoveAnimator`                                    | Imperative | Animate by element reference from code                          | Stable       | Raw `element.animate()`                   |
| `moveValue` / `moveTransform` / `moveSpringValue` | Value      | Signals that derive continuous motion                           | Stable       | Manual `requestAnimationFrame` loops      |

## Where the overlaps are

### move / moveAnimate vs moveAnimation

`[move]` / `moveAnimate` take a preset name or keyframe pairs and play _once_. `[moveAnimation]` takes single-value `initial`, `animate` and `exit` states and _follows_ `animate` as it changes.

```html title=one-shot-vs-reactive.html
<!-- One-shot: plays when the element is created, ignores 'open' afterwards -->
<div moveAnimate="fade-up">Card</div>

<!-- Reactive: animates to the new target whenever 'open()' changes -->
<div
  [moveAnimation]="{
    initial: { opacity: 0.6, scale: 0.98 },
    animate: open() ? { opacity: 1, scale: 1 } : { opacity: 0.6, scale: 0.98 }
  }"
>
  Card
</div>
```

### moveEnter / moveLeave vs presence

`moveLeave` alone cannot delay removal of an element that `@if` destroys. Pair it with `*movePresence` (a view) or use `*movePresenceFor` (a keyed list).

```html title=presence.html
<!-- Wrong: the node is removed before moveLeave can run -->
@if (open()) {
<aside moveLeave="fade-down">Panel</aside>
}

<!-- Right: presence keeps the view until the leave animation finishes -->
<ng-container *movePresence="open()">
  <aside moveEnter="fade-up" moveLeave="fade-down">Panel</aside>
</ng-container>
```

## Rule of thumb

1. Plays once when created? `moveEnter` or `[move]`.
2. Follows a signal on one element? `[moveAnimation]`.
3. Named states shared by a subtree? `moveVariants`.
4. Needs to stay mounted while leaving? `*movePresence` / `*movePresenceFor`.
5. Driven by an event handler? `MoveAnimator`.
6. Driven by a continuous number? `moveValue` and friends.

Full inputs are in the [API reference](/docs/reference).
