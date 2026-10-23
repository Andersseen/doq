---
title: Migration and compatibility
description: What has been verified, what has not, and how upgrades behave.
group: Reference
order: 30
---

## Verified environments

| Environment | Evidence |
| --- | --- |
| Angular 21.2, TypeScript 5.9, Analog 2.9 | Unit, component, contract, end-to-end and tarball-consumer suites |
| Angular 22.2, TypeScript 6.0, Analog 2.9 | A focused smoke suite against the packed tarball: strict peers, `doq-api check`, `doq-search`, prerender, hydration, navigation, search, versions |
| Zoneless Angular | Both environments run without Zone.js |
| Chromium, Firefox, WebKit | Engine-dependent journeys; the full suite runs in Chromium |

Node.js `^20.19 || ^22.12 || >=24`.

## Not verified

- Applications that load Zone.js.
- Vite below version 8, and Analog above 2.9.x.
- Screen-reader output, Windows high-contrast themes and WCAG certification.
- Mobile browsers beyond viewport emulation.

Peer ranges are not widened without testing. `doq doctor` reports a version outside the declared range as a failure and a range it cannot evaluate as `UNKNOWN`.

## Upgrading

Configuration objects from earlier releases keep working unchanged. Search, versioning, API generation and the Vite helper are opt-in. Each release's changes are in the [changelog](https://github.com/Andersseen/doqs/blob/main/packages/doq/CHANGELOG.md).

## Migrating an existing documentation area

Mount Doqs under a different `basePath` (for example `/handbook`) while existing `/docs` routes keep working, move pages gradually, then switch the mount path. The repository's migration guide walks through an Angular Movement example.

## Stability

Doqs is pre-1.0. The public surface is listed on the [public API page](/docs/reference/public-api) with its stability intent; removals are preceded by deprecation and noted in the changelog.
