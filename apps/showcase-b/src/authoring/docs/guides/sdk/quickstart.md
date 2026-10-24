---
title: SDK quickstart
description: Configure and create a typed Forge client, with every snippet read from the SDK source and linked to the SDK reference.
group: Guides
order: 6
---

This page lives in a nested route, mounted at the root of a docs-first site. Its code is read from `forge-sdk/src` and its links come from the generated SDK reference, so neither can go stale unnoticed.

::include{file="/_partials/install.md"}

## Configure the SDK

Every client shares one [[api:ForgeConfig]] object, frozen by [[api:defineForgeConfig]].

::source{file="forge-sdk/src/config.ts" region="forge-config" title="config.ts"}

## Create a client

[[api:createForgeClient]] takes the secret key and, optionally, that configuration. Reading a page of entries resolves to a [[api:ForgePage|ForgePage]].

::source{file="forge-sdk/src/client.ts" lines="51-52" lang="ts"}
