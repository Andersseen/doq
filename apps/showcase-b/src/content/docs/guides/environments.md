---
title: Environments
description: Separate development, preview, and production content safely.
group: Guides
order: 5
---

## Keep environments distinct

Use separate credentials and delivery endpoints for development, preview, and production. This protects live content while teams review changes.

## Preview access

Preview tokens are privileged. Keep them on the server and avoid sharing preview URLs outside the intended audience.

> [!WARNING]
> A preview token can read unpublished entries. Never place one in client-side code, a public repository, or a shared screenshot.

## Promotion flow

Review changes in a preview environment before publishing to production. Keep the promotion process visible so authors can understand where an update is available.

:::steps

1. **Draft in development.** Authors edit entries against the development environment.

2. **Review in preview.** Share the preview URL only with reviewers who may see unpublished content.

   > [!NOTE]
   > Preview deployments read from the preview delivery endpoint, never from production.

3. **Promote to production.** Publish the approved entries; the production endpoint serves them immediately.

:::
