---
title: Getting started
description: Connect your first application to the ForgeCMS content platform.
group: First steps
order: 1
---

## Create a workspace

Start with a workspace for your product, then invite the people who model and publish content.

```bash
pnpm add @forgecms/client
```

Configure the client on the server where possible. Keep environment credentials out of browser bundles.

## Request an entry

```ts
const entry = await forge.entries.get({
  collection: 'product-guides',
  slug: 'first-release',
});
```

The response is structured data. Render it using the components and typography your product already uses.

## Continue

- [Understand the content model](/docs/concepts/models)
- [Learn about delivery architecture](/docs/architecture/content-delivery)
- [Review the API reference](/docs/reference/api)
