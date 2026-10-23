---
title: Rich Markdown
description: Callouts, tabs, code groups, steps and titled code in plain Markdown.
group: Guides
order: 13
---

These patterns are built in. They need no registration and no Angular code, they are rendered into the static HTML, and their text is searchable.

## Callouts

````markdown
> [!NOTE]
> Lists, [links](/docs/installation) and `inline code` work inside.

> [!WARNING]
> Avoid browser-only APIs during server rendering.
````

> [!NOTE]
> Kinds are `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`. The marker must be alone on the first line.

> [!WARNING]
> Ordinary blockquotes and unknown markers such as `[!DANGER]` are left as written.

## Tabs and code groups

````markdown
:::tabs Package manager

:::tab pnpm

```bash
pnpm add @doqs/analog
```

:::tab npm

```bash
npm install @doqs/analog
```

:::
````

:::tabs Package manager

:::tab pnpm

```bash
pnpm add @doqs/analog
```

:::tab npm

```bash
npm install @doqs/analog
```

:::

A group whose tabs contain only code is a code group. Arrow keys move between tabs, Home and End jump to the first and last, and every panel is in the static HTML.

## Steps

````markdown
:::steps

1. **Install** the package.
2. **Register** the routes.

:::
````

:::steps

1. **Install** the package.
2. **Register** the routes.

:::

## Titled code

````markdown
:::code app.config.ts

```ts
export const appConfig = { providers: [provideDoq(doqConfig)] };
```
````

:::code app.config.ts

```ts
export const appConfig = { providers: [provideDoq(doqConfig)] };
```

## Rules

- Directive lines (`:::tabs`, `:::tab …`, `:::steps`, `:::code …`, `:::`) are paragraphs of their own: leave a blank line around them.
- A group that does not parse exactly stays on the page as the author wrote it.
- `::demo[id]` works at the top level of an article, but not inside a tab or a step.
- Nothing is evaluated: Doqs wraps Analog's rendered HTML, so heading ids and the table of contents are unchanged.
