---
title: Source-backed guide
description: Code read from the Angular Movement source, linked to its generated API reference and placed next to a live playground.
group: Start
order: 4
---

::include{file="/_partials/prerequisites.md"}

## Configure the provider

The function below is read from the real source file, not copied. [[api:provideMovement]] documents its parameter, [[api:MovementConfigInput|the input type]] its options and [[api:MoveEnterDirective]] the directive used in the next section.

::source{file="projects/movement/src/lib/providers/provide-movement.ts" region="provide-movement" title="provide-movement.ts"}

## Try the directive

::playground[movement-enter]

Source-backed searchable phrase: quince-basalt-lantern.
