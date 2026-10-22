---
title: Getting started
description: Connect your first application to the ForgeCMS content platform.
slug: onboarding/first-application
group: First steps
order: 1
demo: forge-schema
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

> [!TIP]
> Request only the fields a page renders. Smaller responses are faster to deliver and easier to cache.

The same request over HTTP, for scripts and other runtimes:

:::tabs Request style

:::tab TypeScript client

```ts
const entry = await forge.entries.get({ collection: 'product-guides', slug: 'first-release' });
```

:::tab HTTP

```bash
curl -H "Authorization: Bearer $FORGE_TOKEN" \
  "https://api.forgecms.example/v1/product-guides/first-release"
```

:::

## Continue

- [Understand the content model](/concepts/models)
- [Learn about delivery architecture](/architecture/content-delivery)
- [Review the API reference](/reference/api)
