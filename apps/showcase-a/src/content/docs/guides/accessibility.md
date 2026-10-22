---
title: Accessibility
description: Keyboard, focus, contrast and announcement guidance for every Vanta UI component.
group: Guides
order: 3
---

## Principles

Vanta UI components start from native elements. A button is a button, a link is a link, and a list of choices is a list. This keeps keyboard operation, focus order and assistive technology support working before any custom behavior is added.

Every interactive component documents the same four things: how it is reached with the keyboard, how it shows focus, what its accessible name is, and what it announces when its state changes.

## Keyboard operation

Tab moves forward through interactive controls in the order they appear on the page, and Shift+Tab moves backward. Components never trap focus unless they are modal, and modal components always provide an Escape key and a visible close control.

> [!IMPORTANT]
> A modal must return focus to the control that opened it when it closes. Without this, keyboard users are dropped at the top of the page.

Composite widgets such as tab lists and menus use a single tab stop. Arrow keys move between items, Home and End jump to the first and last item, and the active item is announced as it changes.

## Focus visibility

Focus must always be visible. Vanta UI draws a three pixel outline using the focus token, with an offset so it never touches the control's own border. The outline meets the contrast requirement against both the dark and the light theme.

Do not remove the outline to achieve a cleaner appearance. If a control needs a different focus style, change the token and keep the contrast.

> [!WARNING]
> `outline: none` without a replacement makes a control unusable by keyboard. Before you ship a custom style:
>
> - Check it against both the dark and the light theme.
> - Tab through the page and confirm the ring is always visible.
> - Read the [theme guide](/docs/guides/theming) for the focus token.

## Examples

A labelled field announces its purpose before its value. Connect the label to the input with the `for` attribute rather than relying on placeholder text.

A destructive action should name what it destroys. "Delete project Atlas" is announced clearly; "OK" is not.

::demo[vanta-contrast]

After trying the pair above, keep the ratio you measured in your own tokens: contrast is a property of the pair, not of one color.

## Color and contrast

Text uses at least a 4.5 to 1 contrast ratio against its background, and large text uses at least 3 to 1. Status is never communicated by color alone: errors also carry an icon and a text message.

Verify contrast in both themes. A pairing that passes on the dark surface can fail on the light surface when the accent color is reused for body text.

## Announcements

Live regions announce changes without moving focus. Use a polite status region for results counts and saved confirmations, and reserve assertive alerts for errors that block the task.

Keep announcements short and specific. A search that returns four matches announces "4 results", not a description of the layout.

> [!CAUTION]
> Never announce a result by moving focus unexpectedly. A live region reports the change; focus stays where the user put it.

## Examples

Review a finished page by unplugging the mouse. Move through the page with Tab, open every menu with the keyboard, and confirm that the focus ring is always visible and the order matches the reading order.

Then zoom the page to 200 percent and confirm that no content is clipped and nothing requires horizontal scrolling for ordinary reading.

## Checklist

- Every control has an accessible name.
- Focus is visible and logical.
- Colors meet contrast in every theme.
- State changes are announced.
- The page works at 200 percent zoom and on a narrow screen.
- The final accessibility checkpoint phrase for reviewers is "lantern-cobalt-ledger".

Messages that appear after load must be announced. The Vanta alert renders with `role="alert"`; its required `tone` input and its `dismissed` output are listed in the generated [VantaAlertComponent reference](/docs/reference/generated/vanta-alert-component), and [VantaTooltipDirective](/docs/reference/generated/vanta-tooltip-directive) documents descriptions that also open on keyboard focus.
