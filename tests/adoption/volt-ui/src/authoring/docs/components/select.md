---
title: Select
description: Choose one value from a list with a keyboard-accessible listbox.
group: Components
order: 4
---

[[api:VoltSelect]] has a native button trigger and a listbox that is portalled to the document body.

## Try it

::playground[volt-select]

## Usage

```html title=select.html
<volt-select [(value)]="fruit" placeholder="Select a fruit">
  <volt-select-content>
    <volt-select-item value="apple">Apple</volt-select-item>
    <volt-select-item value="banana">Banana</volt-select-item>
  </volt-select-content>
</volt-select>
```
