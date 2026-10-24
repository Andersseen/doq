---
title: Get started
description: Install the library and set up your application configuration.
group: Start here
order: 2
---

## 1. Installation

Install the Angular Movement library using your preferred package manager.

::demo[install-command]

## 2. Register the provider

In your `app.config.ts`, provide the Movement configuration. [[api:provideMovement]] accepts [[api:MovementConfigInput|an optional global config object]] to override default durations or easings. The function below is read from the library source, not copied.

::source{file="projects/movement/src/lib/providers/provide-movement.ts" region="provide-movement" title="provide-movement.ts"}

## 3. Import directives

Import the directives each component uses, usually one to three. Every directive is standalone, so there is nothing else to register. [[api:MoveEnterDirective]] is the one used below.

```ts title=my.component.ts
import { Component } from '@angular/core';
import { MoveEnterDirective } from 'angular-movement';

@Component({
  selector: 'my-component',
  imports: [MoveEnterDirective],
  template: `<div moveEnter="fade-up">I animate on enter!</div>`,
})
export class MyComponent {}
```

## Try it

Change the settings of the real `moveEnter` directive. Each change replays the animation.

::playground[movement-enter]

> [!NOTE]
> That's it. No triggers to set up, no state variables to manage. Browse the [live demos](/demos/enter) for every directive.

Get-started searchable phrase: persimmon-granite-harbor.
