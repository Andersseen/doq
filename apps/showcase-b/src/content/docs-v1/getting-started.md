---
title: Getting started
description: Connect an application to ForgeCMS 1.x with the key-based client.
slug: onboarding/first-application
group: First steps
order: 1
---

## Create a project

ForgeCMS 1.x authenticates with a project **API key**. Keep it on the server; workspace tokens arrived in ForgeCMS 2.

```bash
pnpm add @forgecms/client@1
```

## Request an entry

```ts
const entry = await forge.getEntry('product-guides', 'first-release');
```

The 1.x client resolves one entry per call. Batch reads and the `fields` parameter are not available before 2.0.
