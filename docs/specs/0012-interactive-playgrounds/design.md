# Design — 0012 interactive playgrounds

## Existing implementation

`parseDoqContent` (`doq-rich-content.ts`) cuts Analog's rendered HTML into `html`, `demo` and `tabs` segments; `DoqDocsComponent` renders `demo` segments with `NgComponentOutlet` inside a `data-pagefind-ignore` region. `defineDoqConfig` normalises paths and search. Code highlighting happens at build time in Analog; copy buttons are added to Markdown `<pre>` elements after render.

## Proposed implementation

- **Model** (`doq-playground-model.ts`, pure): control and definition types, `validateDoqPlaygrounds`, `initialDoqValues`, `parseDoqControlText`, `formatDoqUsage`, `formatDoqEventPayload`, `appendDoqEvent`. Runs in Node and the browser; no Angular runtime import.
- **Directive** (`DoqPlaygroundOutletDirective`): `ViewContainerRef.createComponent(component, { bindings })` with `inputBinding(publicName, () => values()[name])` and `outputBinding(event, …)`. Bindings follow the `values` signal, so a control change updates the input in place (public names, transforms, required inputs before first check). It recreates the component only when the definition or the `generation` (reset) changes. Decorator inputs are used deliberately: creation must happen during server rendering, where `ngOnChanges` is guaranteed.
- **Component** (`DoqPlaygroundComponent`): OnPush, signals, native controls. State is a set of `linkedSignal`s keyed to the definition so a reused view never keeps stale values. Ids derive from `doq-playground-<segment index>`, identical on server and browser. `selected` and `checked` are mirrored as attributes so the prerendered HTML shows the initial state.
- **Expand** moves the stage element (the live component host) into a native `<dialog>` with `showModal()` and back on `close`; the instance, its state and its output subscriptions are untouched. Destroying the view restores the stage first.
- **Parser**: `parseDoqDocument` adds `playground` segments (the `playground` flag of the existing parser). `parseDoqContent` keeps its exact signature and behavior, and `DoqDocsComponent.segments` keeps its type; the view renders `parts`.
- **Config**: `playgrounds?: DoqPlaygroundRegistry`; `defineDoqConfig` throws one aggregated error for an invalid registry.
- **Search**: the whole playground is `data-pagefind-ignore`; the unknown-id notice too.
- **Styles**: native controls, existing tokens, two optional tokens, `forced-colors` and `prefers-reduced-motion` blocks, secondary text mixed from the foreground for 4.5:1 contrast.
- **Release**: `release.yml` plan job installs the workspace (`--ignore-scripts`, SHA-pinned `pnpm/action-setup`) before the structural tarball check.

## Tradeoffs and alternatives

- `NgComponentOutlet` + `ngComponentOutletInputs` binds inputs but cannot observe outputs; `ComponentRef.setInput` plus `instance[prop].subscribe` needs the class property name, not the public alias. `createComponent({ bindings })` solves both with the public names. Rejected: reading `ɵcmp` metadata.
- Moving DOM into a dialog (chosen) versus a second instance in the dialog: a second instance would reset state and duplicate subscriptions. Limitation: overlays attached to `<body>` render below the dialog's top layer.
- Reset recreates the component (chosen) so internal state restarts; a control change never does. Documented.
- Controls from `doq-api` metadata: not included; explicit controls are the contract (no inferred select options, no browser TypeScript).
- A separate stylesheet for playgrounds: rejected, consumers import one file; the cost is 0.9 KB gzip, recorded in the budgets.
- Widening `DoqRichSegment`: rejected, it would break exhaustive consumers (found by `verify:public-api`); a parallel `parseDoqDocument` keeps the old API intact.
