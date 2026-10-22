---
title: API reference
description: A concise reference for authenticated collection reads.
group: Reference
order: 4
---

## Read a collection

```ts
const result = await forge.entries.list({
  collection: 'product-guides',
  limit: 20,
  cursor: nextCursor,
});
```

The response contains entries and an optional cursor for the next page.

::demo[forge-query]

Every parameter above is optional except the collection; unknown parameters are rejected rather than ignored.

## Read one entry

Use a stable identifier or slug to load one entry. A missing or unpublished entry should be handled as a normal not-found result.

## Errors

| Response | Meaning |
| --- | --- |
| `401` | The credential is missing or invalid |
| `403` | The identity cannot read this collection |
| `404` | The entry is missing or unpublished |
| `429` | Retry after the response's guidance |
