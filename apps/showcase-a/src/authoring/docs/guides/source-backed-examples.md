---
title: Source-backed examples
description: Code shown on this page is extracted from the Vanta UI source files, linked to its generated API reference and placed next to a live playground.
group: Guides
order: 5
---

This guide is written once and resolved at build time: the code blocks are not copied into the Markdown, they are read from the library's source files.

::include{file="/_partials/setup.md"}

## Alert inputs

The inputs below are a named region of `vanta-alert.component.ts`. Change the source and regenerate, and this block changes with it. See [[api:VantaAlertComponent]] for every input and output, and [[api:VantaTone|the tone type]] for the allowed values.

::source{file="vanta-ui/src/vanta-alert.component.ts" region="alert-inputs" title="vanta-alert.component.ts"}

## A line range

Files without comments for markers can be shown by line range. These are lines 9 to 16 of the tooltip directive, documented at [[api:VantaTooltipDirective]].

::source{file="vanta-ui/src/vanta-tooltip.directive.ts" lines="9-16"}

## Source next to a live component

The wrapper below is the file that the playground renders. Operate its controls, press the preview and compare the result with the code.

::source{file="src/app/demos/button-playground.ts" region="volt-wrapper" title="button-playground.ts"}

::playground[vanta-button]
