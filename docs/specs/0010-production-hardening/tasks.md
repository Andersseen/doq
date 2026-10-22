# Tasks — 0010 production hardening

- [x] T-001 [REQ-001, REQ-002, AC-001] Reproduce the heading-id race independently (`docs/repro/heading-id-concurrency.mjs`), establish the owner, check upstream releases.
- [x] T-002 [REQ-002, AC-001] Implement and unit-test `doqDeterministicMarkdown()` (`@doqs/analog/vite`), declarations, package verifier and contract.
- [x] T-003 [REQ-003, REQ-005, AC-003, AC-004] Implement `pnpm docs:check` and its unit tests; wire it into the build job and the quality gate.
- [x] T-004 [REQ-004, AC-002] Implement `pnpm verify:determinism` (stress consumer, repeated clean builds, control) and run it.
- [x] T-005 [REQ-006, AC-005] Add `--angular=22` (TypeScript 6, strict peers) to `scripts/consumer.ts`, `scripts/compat.ts`, `playwright.compat.config.ts` and `e2e/compat.spec.ts`; run Angular 21 and 22.
- [x] T-006 [REQ-007, AC-006] Add Firefox and WebKit projects, the engine helpers and `pnpm test:e2e:browsers`; triage every failure.
- [x] T-007 [REQ-008, AC-007] Fix Back/Forward scroll restoration in WebKit and prove it in three engines.
- [x] T-008 [REQ-009, REQ-010, AC-008, AC-009] Add forced-colors CSS and `e2e/hardening.spec.ts` (reduced motion, text size, forced colours, tokens, drawer and focus).
- [x] T-009 [REQ-011, AC-010] Add `scripts/perf.ts`, `perf-budgets.json`, `scripts/scale.ts` and the generated fixtures; measure before/after and 20/200/1000 documents.
- [x] T-010 [REQ-012, AC-011] Audit the metadata lifecycle and add `metadata.spec.ts`.
- [x] T-011 [REQ-005, REQ-013, AC-004, AC-012] Extend the pytest contracts (links, ids, tarball contents) and the adoption proof (single build, `docs:check`).
- [x] T-012 [REQ-014, AC-013] Bump to 0.7.0, changelog, READMEs, CONTRIBUTING, CI jobs, quality gate steps.
- [ ] T-013 [REQ-013, AC-012] Run the complete quality gate and the adoption proof against the final code and record the real results in `verification.md`.
