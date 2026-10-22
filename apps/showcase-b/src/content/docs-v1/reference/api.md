---
title: API reference
description: The 1.x delivery API, which only supports reading a single entry.
group: Reference
order: 4
---

## Read one entry

Call `getEntry` with a collection and a slug. A missing entry resolves to `null`.

## Legacy pagination

The 1.x delivery API paginates with a numeric `page` parameter. Cursors replaced it in 2.0, and `limit` is capped at 20 entries.

See the generated [ForgeClient reference](/v/1/reference/generated/forge-client).

## Index note

The tidewater-index parameter was also called sandpiper-offset in 1.x.
