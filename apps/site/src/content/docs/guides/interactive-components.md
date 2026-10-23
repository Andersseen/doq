---
title: Interactive components
description: Place your own standalone Angular components between Markdown paragraphs.
group: Guides
order: 14
---

Doqs is not MDX. Markdown never contains Angular templates; instead you register standalone components once, and a one-line directive names them.

## Register

```ts
const doqConfig = defineDoqConfig({
  ...doqPaths,
  demos: { 'install-command': InstallDemo, 'enter-animation': EnterDemo },
});
```

## Place

```markdown
Pick your package manager:

::demo[install-command]
```

The directive must be the only text on its line, separated by blank lines. The id uses letters, digits, `_` and `-`. Alternatively, `demo: install-command` in frontmatter appends the component to one document.

## Live example

This component belongs to the documentation site, not to Doqs. It is server-rendered, hydrated and keyboard-operable:

::demo[install-command]

A second registered component, animated by Angular Movement and controlled with Volt UI components from the host:

::demo[enter-animation]

## Behavior

- Components are created without inputs; inject host services instead.
- They live in the Angular tree: signals, `OnPush`, dependency injection and zoneless change detection all work.
- An unregistered id renders an accessible notice and the page keeps working.
- Demos are excluded from the search index; the Markdown around them is indexed.
- A directive inside a code block, list, blockquote or table stays literal text.
- Slots (`indexAfterIntro`, `documentAfterContent`) add the same component to every page of a kind.

## Need controls?

A demo has no inputs and no chrome. To let readers change a component's inputs, watch its outputs, resize the preview and copy usage code, register a playground instead: see [Interactive playgrounds](/docs/guides/interactive-playgrounds).
