# 0005 — official site design system

## Problem

The official Doqs website (`apps/site`) is styled by one hand-written 106-line `styles.css` and four hand-written components: custom buttons (`.button`), custom feature list (`.features`), a custom menu toggle (`.menu-toggle`, `.site-header nav.open`), a custom copy command (`.command`) and an unstyled `figure`/`pre` code layout. The owner maintains Volt UI (components and semantic themes), Lumen Icons and Angular Movement for exactly these jobs, yet the site uses none of them, has no icons, no motion, no theme toggle (it follows the system only) and shows all code samples stacked. The landing therefore neither exercises the owner's ecosystem nor offers a polished, consistent interaction layer.

## Consumer impact

None. `@doqs/analog` is not touched: no version bump, no API, README or CHANGELOG change, no package output change. Only `apps/site` (and its tests, lockfile and this spec) change, so the release workflow's eligibility check (package version vs. npm) finds nothing to publish.

## Scope

- Tailwind CSS 4 (CSS-first, `@tailwindcss/vite`) in `apps/site`.
- Volt UI (`@voltui/components`) as the component system, with the `ember` colour and `soft` style presets as the theme; Lumen Icons (`lumen-icons/<name>` per-icon imports) as the only icon system; Angular Movement for motion.
- Rewrite of the header (Volt drawer on mobile), hero, features, getting-started (Volt tabs), "how it works", interactive-Markdown section (live demo) and footer, keeping the existing message, structure and editorial identity.
- A contained theme controller (system preference by default, explicit choice persisted, no flash).
- Component, unit and Playwright tests; measured bundle comparison; visual review.

## Non-goals

Any change to `packages/doq`, the showcases, the release or deploy workflows or other repositories; `@doqs/analog` 0.4; Quartz, Angular Material or another UI/animation/icon library; `@angular/animations`; making the landing a Doqs docs consumer; new routes, domains or fake metrics/testimonials.

## Requirements

- **REQ-001** Volt UI is the component system: buttons and links-as-buttons (`voltButton`), cards, badges, separators, tabs, the mobile drawer and the demo's toggle group are the real `@voltui/components` exports; no hand-written look-alikes remain (legacy `.button`, `.features`, `.command`, `.menu-toggle`, `.steps`, `.frame`, `.site-header`, `.site-footer` CSS is removed). Semantic HTML (landmarks, headings, lists, figure, pre/code, nav links) is kept where Volt has no primitive.
- **REQ-002** Tailwind CSS 4 provides layout and typography; Volt's semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, `text-primary`, …) provide every colour. No component-specific hardcoded colours, no per-component dark overrides.
- **REQ-003** The theme is Volt `ember`/`soft`, light and dark. `provideVoltTheme` runs on server and client; the stored or system preference is applied before first paint by a tiny inline script; a header toggle (named button with `aria-pressed`) switches via Volt's `applyVoltTheme` and persists the explicit choice; no `window`/`localStorage` access during SSR and no hydration mismatch.
- **REQ-004** Lumen Icons are imported one by one (no catalog import); decorative icons stay `aria-hidden`; icon-only controls have accessible names; the wordmark stays text.
- **REQ-005** Angular Movement provides restrained motion: transform-only hero figure entrance, in-view staggered reveals for feature and step cards, lift/press on the primary CTAs and the real enter-animation demo. Only used directives are imported; reduced motion is honoured (Movement's automatic behaviour plus `scroll-behavior`); essential text and controls are never faded.
- **REQ-006** Header: wordmark, Features, Getting started, Interactive Markdown, GitHub, npm and the theme toggle; on small screens a Volt drawer with correct focus handling (focus trapped, Escape closes, focus returns to the trigger, links close it).
- **REQ-007** Getting started: the exact install command with a copy button; a Volt tab set with four real examples (shared paths, Analog prerender, Angular providers, demo registration) using public `@doqs/analog` names; each copies exactly the visible text and degrades gracefully when the clipboard is unavailable.
- **REQ-008** The interactive-Markdown section shows the real `::demo[id]` Markdown next to a working Angular component (Volt toggle group + button, Angular Movement `moveEnter`), states that the consumer owns the components, and does not claim MDX or template execution.
- **REQ-009** The static output contains the hero, features, tabs content and Volt markup; the page hydrates without console errors or warnings; canonical/OG/robots/sitemap behaviour and `wrangler.jsonc`/`deploy-site.yml` are unchanged.
- **REQ-010** No horizontal overflow at 320, 375, 768, 1280, 1440 and 1920 px; axe finds no serious or critical violation in light and dark; focus is visible.
- **REQ-011** Bundle and CSS changes are measured against the 0.3.0 site and documented.

## Acceptance cases

- **AC-001** [REQ-001] Rendered landing contains `volt-card`/`volt-badge`/`voltButton`/tab/toggle-group components and none of the legacy class families remain in `styles.css`.
- **AC-002** [REQ-002] `styles.css` imports Tailwind and the Volt ember-soft preset only; templates use semantic token classes; switching the theme changes the computed background.
- **AC-003** [REQ-003] With a dark system preference the page loads with `.dark`; the toggle flips `.dark` and `aria-pressed`, survives reload and stores `doqs-theme`; unit tests resolve explicit/system/invalid preferences.
- **AC-004** [REQ-004] Decorative icons render `aria-hidden="true"` with no label; icon-only buttons are named; only per-icon modules are imported.
- **AC-005** [REQ-005] Under `prefers-reduced-motion: reduce` all feature cards are fully opaque; the enter demo switches preset and replays; hero CTAs click, focus and activate by keyboard.
- **AC-006** [REQ-006] The mobile drawer opens by keyboard, keeps focus inside, closes on Escape returning focus to Menu, and a link closes it and scrolls to the section; desktop navigation exposes all links with correct `href`s.
- **AC-007** [REQ-007] Tabs expose a named tablist, arrow-key navigation and the public API names; copied text equals the visible code; a rejected clipboard shows the manual-copy message.
- **AC-008** [REQ-008] The section contains `::demo[install-command]`, "Doqs is not MDX" and the live component.
- **AC-009** [REQ-009] The raw prerendered HTML contains the hero text, feature titles, `<volt-card`, `data-color="ember"` and example code; the browser console has no errors or warnings after load and scrolling.
- **AC-010** [REQ-010] Overflow is ≤ 0 at all six widths; axe is clean in light and dark; the first Tab stop is the skip link with a visible outline.
- **AC-011** [REQ-011] Before/after sizes of JS, CSS and HTML are recorded in `verification.md`.
- **AC-012** [REQ-001, REQ-009] The full existing gate (library, showcases, tarball, contract, MVP harness) still passes and no package version changes.

## Public API impact

None. `@doqs/analog` exports, config, frontmatter keys, routes and `--host-docs-*` tokens are unchanged.

## Compatibility

Angular 21.2 (Volt, Lumen and Movement all declare `^21.2` or newer peers), Analog 2.9, Vite 8, Node ≥ 22.22.3. Tailwind 4.3 with `@tailwindcss/vite`. The site stays statically prerendered; Angular Movement directives are no-ops on the server. `@angular/cdk`, `@angular/forms` and `ng-primitives` are added as direct dependencies because Volt requires them as peers/direct deps and the header imports `injectDialogRef`.
