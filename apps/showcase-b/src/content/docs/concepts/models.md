---
title: Content models
description: Design structured entries that scale across products and channels.
group: Concepts
order: 2
---

## Model the meaning

A content model describes the fields and relationships that make an entry useful. Model a product guide around its intent, audience, and update cadence rather than one page layout.

| Field | Type | Notes |
| --- | --- | --- |
| Title | Short text | Required and localized |
| Summary | Long text | Useful in lists and metadata |
| Body | Rich text | Render through your design system |
| Related guides | Reference | Keep related material connected |

Pick a field type to see how an editor would encounter it:

::demo[forge-schema]

## Reuse with care

Reusable models make delivery consistent. Keep editorial concepts understandable for the teams who maintain them.

## Query entries

Entries are read through the delivery API. Adjust the request below and send it to see the output the client reports.

::playground[forge-request]

Failed requests can be retried. Compare two policies side by side: each playground keeps its own state.

::playground[forge-retry]
