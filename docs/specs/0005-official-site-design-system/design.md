# Design — 0005 official site design system

## Existing implementation

`apps/site` is an Analog app (`ssr: true`, `static: true`, one prerendered route `/`). `styles.css` (106 lines) defines palette variables with a `prefers-color-scheme` media query, then classes for every component. `SiteHeader` toggles a class on a `<nav>`; `CopyCommand` is a bespoke button; `HomePage` holds copy, three stacked code figures and a four-column feature grid. No icons, no motion, no Tailwind.

### Current-state audit and component mapping

| Old (custom)                            | New                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `.button`, `.button.primary`            | `<a voltButton>` / `<button voltButton>` (`solid`, `outline`, `ghost`, `link`)            |
| `.features` grid of `li`                | `VoltCard` + header/title/content; featured card for ::demo, `VoltBadge` "New in 0.3"     |
| `.steps` counter list                   | `<ol>` of `VoltCard` with `VoltBadge` numerals                                            |
| `.menu-toggle` + `nav.open`             | icon `voltButton` + `VoltDrawer` (overlay, content, title, description, close)            |
| `.command` + inline button              | `VoltCard` + `CopyButton` (`voltButton` + Lumen `copy`/`check`)                           |
| stacked `.code` figures                 | `VoltTabs` (tablist, triggers, panels) with `VoltBadge` filename and `CopyButton`         |
| `.eyebrow`                              | `VoltBadge` (secondary)                                                                   |
| `border-top` section rules, footer rule | section borders from tokens; `VoltSeparator` in header/footer/how-it-works                |
| `.frame` documentation illustration     | `VoltCard` + Tailwind grid (host parts dashed, Doqs region `border-primary`)              |
| `--accent`/`--bg`/… palette             | Volt ember tokens through Tailwind (`primary`, `background`, `muted`, `border`, …)        |
| (none) theme                            | `ThemeController` + `applyVoltTheme` + header toggle (`VoltNativeButton`, Lumen sun/moon) |
| (none) live example                     | `EnterDemo`: `VoltToggleGroup`, `voltButton`, Angular Movement `moveEnter`                |

Kept as semantic HTML: `main`, `section` with `aria-labelledby`, headings, `ul`/`ol`, `figure`/`figcaption`, `pre`/`code`, `nav` links, `footer`.

## Proposed implementation

- **Tailwind 4**: `@import 'tailwindcss'` and `@import '@voltui/components/themes/presets/ember-soft.css'` (one preset; `themes.css` would pull the default `volt-sharp`). The preset registers `@source` for Volt's compiled bundle and maps `--color-*` tokens, so utilities like `bg-muted` exist. `styles.css` keeps only `@theme` font stacks (no font downloads), base rules (focus ring, smooth scroll, heading font) and the hero grid texture.
- **Theme architecture**: Volt owns the tokens and the `.dark` class. `provideVoltTheme({ color: 'ember', style: 'soft', dark: readInitialDark() })` runs on the server (`dark: false`, written into the prerendered `<html>`) and in the browser. `index.html` carries a 6-line script that sets `.dark`/`color-scheme` from `localStorage` or the system preference before paint, so there is no flash and Volt's browser initialiser (which reads the same inputs) agrees. `ThemeController` (root service) holds a `dark` signal that is read from the DOM in `afterNextRender` (server and first client render are both "light", so hydration is identical); `toggle()` calls `applyVoltTheme` and stores `light`/`dark`. The sun/moon pair is swapped with CSS (`dark:` variant keyed on `.dark`), not with a conditional, so no structural hydration difference exists. `resolveDark` (build-safe, unit tested) is the only decision logic.
- **Motion principles**: transform/opacity only, once, short (≈400–500 ms), never on text a reader needs immediately (the `h1`, lead and CTAs are static); the hero figure uses a transform-only keyframe (`{ y: [16, 0] }`); cards use `moveInView="fade-up"` inside a `moveStagger` list; primary CTAs use `moveWhileHover="lift"` and `moveWhileTap="press"` (native click, focus and link semantics are untouched). Reduced motion is automatic in Angular Movement (end state immediately) and `scroll-behavior` is reset in CSS. No `provideMovement` config is needed; no `@angular/animations`.
- **Icons**: per-icon modules (`lumen-icons/arrow-right`, …), 19 distinct icons. Decorative by default; the `Menu` and `Dark theme` buttons are named on the button, the drawer close has Volt's own label.
- **Header drawer**: `VoltDrawer` (ng-primitives dialog) provides focus trap, Escape and focus restore. A small `CloseDrawer` directive uses `injectDialogRef` so followed links close it.
- **Getting-started**: `CodeTabs` takes examples as data. `CopyButton` copies `text` verbatim, announces through a `role="status"` region and shows a manual-copy message when `navigator.clipboard` rejects.
- **Accessibility requirements**: one `h1`; named landmarks; skip link; native links for navigation; visible focus (`outline-ring`); icon-only buttons named; tabs/toggle semantics from ng-primitives; contrast checked by axe in both themes.
- **Performance budgets**: no new font or image requests; no catalog imports; main JS gz ≤ 1.75× the 0.3.0 site (84 KB → ≤ 147 KB), CSS ≤ 12 KB gz; no layout shift from motion (transform/opacity); prerendered HTML ≤ 120 KB raw. Results are in `verification.md`.
- **SSR/SSG**: all new components render on the server; Movement directives are server no-ops; Volt applies theme attributes through the platform `DOCUMENT`.

## Tradeoffs and alternatives

- `themes.css` (default blue `volt-sharp`) vs. the `ember-soft` preset: ember is the closest to the existing orange identity (warm neutral surfaces, orange primary) and its tokens passed axe contrast in both themes.
- Using only Volt's `.dark` class instead of keeping `prefers-color-scheme` CSS: one mechanism, user choice possible. The inline script is the price (a few bytes, no CSP in the project).
- Direct `ng-primitives` dependency: needed for `injectDialogRef`; the alternative (closing the drawer by clicking a hidden Volt close control) is fragile. It is the same version Volt resolves, so no duplicate runtime.
- Fading the hero actions or text was tried first and rejected: opacity during the entrance dropped CTA contrast below 4.5:1 while axe ran (found by the dark-mode axe test), and delayed reading.
- Volt's critical styles come as many long utility class strings, and every Lumen icon instance inlines its keyframes: prerendered HTML grows from 10.9 KB to 101 KB (13.5 KB gzip). Accepted for a single static page; the alternative (CSS-only icons) would violate the Lumen requirement.
