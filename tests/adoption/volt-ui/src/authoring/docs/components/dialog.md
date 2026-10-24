---
title: Dialog
description: Open a modal dialog from a template, with focus management and dismissal handled for you.
group: Components
order: 2
---

A dialog's open state belongs to your component with [[api:VoltDialogRoot]]. The overlay and content render in the application root, so a dialog outlives the element that opened it.

## Try it

Open the real Volt UI dialog from the playground. Escape and the **Cancel** button close it; the result appears in the output inspector.

::playground[volt-dialog]

## How it is wired

The directive below is read from the library source. It stays a thin wrapper over the ng-primitives dialog trigger.

::source{file="projects/volt/src/lib/components/dialog/dialog.ts" lines="1-16" title="dialog.ts"}

## Usage

```html title=dialog.html
<ng-template voltDialogRoot [(open)]="editing" (closed)="onClosed($event)" let-close="close">
  <div voltDialogOverlay></div>
  <div voltDialogContent>
    <h2 voltDialogTitle>Edit profile</h2>
    <button voltButton (click)="close('saved')">Save</button>
  </div>
</ng-template>
```
