# Verification — 0005 official site design system

## Test cases

| Case       | Acceptance                                             | Checks                                                                                                                    | Result |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| UNIT-050   | AC-003                                                 | theme preference: explicit wins, system fallback, invalid stored values ignored                                           | PASS   |
| COMP-020   | AC-001, AC-008                                         | landing: one h1, four sections, real 0.3 features, no MDX claim, primary links                                            | PASS   |
| COMP-021   | AC-006                                                 | header links, Volt drawer open/Escape/link-close, footer links                                                            | PASS   |
| COMP-022   | AC-007                                                 | copy writes the exact command, announces it, swaps the Lumen icon, explains a rejected clipboard                          | PASS   |
| COMP-050   | AC-008                                                 | interactive-Markdown section shows `::demo[...]`, the live "Rendered" card and states Doqs is not MDX                     | PASS   |
| COMP-060   | AC-007                                                 | tabs: named tablist, four examples, public API names per panel, arrow-key navigation                                      | PASS   |
| COMP-061   | AC-001, AC-004                                         | Volt cards/badge/button and Lumen icons render; decorative icons are `aria-hidden` without labels                         | PASS   |
| COMP-062   | AC-003                                                 | theme toggle: named, `aria-pressed`, applies Volt `.dark`, persists the choice                                            | PASS   |
| COMP-063   | AC-005                                                 | enter demo: Volt toggle group switches the Angular Movement preset, replay re-creates the target                          | PASS   |
| E2E-030    | AC-002, AC-003, AC-005, AC-006, AC-007, AC-009, AC-010 | production build: hero, nav, drawer focus, six widths, tabs and clipboard, demo, reduced motion, theme, SSR, axe, console | PASS   |
| MANUAL-050 | AC-011                                                 | bundle, CSS and HTML before/after                                                                                         | PASS   |
| MANUAL-051 | AC-002, AC-010                                         | screenshots reviewed: desktop and mobile, light and dark, 320 px                                                          | PASS   |
| MANUAL-052 | AC-012                                                 | `pnpm quality:gate`                                                                                                       | PASS   |
| MANUAL-053 | AC-012                                                 | Cloudflare deployment status                                                                                              | PASS   |

## Executed commands

- `pnpm install --frozen-lockfile` (lockfile up to date), then `PW_CHANNEL=chrome pnpm quality:gate` (exit 0): format:check, typecheck:scripts, sdd:check (5 specs), agentyx:check, test:unit (214 tests), test:components (67 library + 14 site), build, pack:doq, verify:package, test:contract (38), verify:negative-controls, consumer:build, test:e2e (106 passed, 22 of them in `e2e/site.spec.ts`), verify:mvp (with tarball consumer). Earlier iterations failed and were fixed: horizontal overflow at 375 px (grid tracks sized by `pre` content; fixed with `grid-cols-1`), the dark-mode axe test (CTA contrast during an opacity entrance; removed the fade from the hero actions), a stale `pre` selector and the toggle-group role in the tests.
- Bundle (MANUAL-050), `vite build` client output, gzip in parentheses:

  | Asset            | 0.3.0 site         | This change         |
  | ---------------- | ------------------ | ------------------- |
  | main JS          | 269.2 kB (84.2 kB) | 505.2 kB (141.2 kB) |
  | page JS          | 9.3 kB (3.8 kB)    | 90.1 kB (24.0 kB)   |
  | CSS              | 6.8 kB (2.2 kB)    | 58.8 kB (11.3 kB)   |
  | prerendered HTML | 10.9 kB (3.9 kB)   | 101.0 kB (13.5 kB)  |

  Total JS gzip 88 kB to 165 kB (+77 kB): Volt (ng-primitives, CDK, floating-ui), Angular Movement and 19 Lumen icons. The design budget for main JS (≤ 147 kB gz) and CSS (≤ 12 kB gz) is met; the HTML growth comes from Volt class strings and per-icon inlined keyframes. Only the used icon modules appear in the bundle (no catalog). No Lighthouse run and no CLS measurement were made: NOT RUN. Fonts: system stacks, no requests.

- Visual review (MANUAL-051): full-page screenshots of the production build in Chromium at 1280 px light and dark, 375 px light and dark and 320 px, read one by one; no horizontal overflow at 320, 375, 768, 1280, 1440 and 1920 px (E2E). The sticky header appears mid-page in full-page captures; that is a screenshot artifact.
- Cloudflare (MANUAL-053): `gh run list --workflow deploy-site.yml` shows the latest run for main (`cc34391`) failed with `The Pages project "doq-site" does not exist`. A read-only `wrangler pages project list` with the maintainer's login still lists no project containing `doq`. **Maintainer action unchanged:** create the Direct Upload project `doq-site` (or rename it in `apps/site/wrangler.jsonc`) and confirm `CLOUDFLARE_ACCOUNT_ID`. This PR does not touch the deployment pipeline, and the site is not deployed.
- No `packages/doq` file and no version changed, so the release workflow has nothing to publish.

## Remaining limitations

- Lighthouse and CLS were not measured; motion is transform/opacity only and the layout is not shifted by animation, but that is by design, not a measurement.
- No persistent screenshot snapshot tests: they would not be reliable across machines in the existing infrastructure.
- The reduced-motion test checks the final state (cards opaque, no smooth scroll) under emulated `prefers-reduced-motion`; Angular Movement's own jump-to-end behaviour is its library contract.
- Production deployment is blocked by the missing Cloudflare Pages project (above), independent of this PR.
