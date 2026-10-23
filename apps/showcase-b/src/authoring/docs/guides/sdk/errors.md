---
title: Handling errors
description: The error codes a Forge request can fail with, shown from source, and the shared installation notes.
group: Guides
order: 7
---

::include{file="/_partials/install.md"}

## Error codes

A rejected request carries one of the [[api:ForgeErrorCode]] values.

::source{file="forge-sdk/src/client.ts" region="error-codes" title="client.ts"}

Retry only `rate_limited`; the other two need a different request, not another attempt.
