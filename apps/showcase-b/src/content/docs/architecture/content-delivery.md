---
title: Content delivery
description: Keep the authoring model separate from the applications that consume it.
group: Architecture
order: 3
---

## A delivery boundary

ForgeCMS stores structured entries and exposes them through APIs. Your application decides how to present those entries, which lets the same content support several experiences.

```text
Editors → ForgeCMS model → Delivery API → Application UI
```

## Cache deliberately

Use cache headers and revalidation rules that match how quickly each content type changes. Do not cache private preview content in a public edge cache.

## Keep the host in control

An application should own global navigation, type, and colors. This documentation site follows the same principle: Doq supplies content navigation and page mechanics while the Forge host supplies its product shell.
