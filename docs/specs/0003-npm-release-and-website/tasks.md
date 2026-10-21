# Tasks — 0003 npm release and website

- [x] T-001 [REQ-001, AC-001] Add `engines` and `publishConfig.access`; assert manifest fields in `UNIT-024` and run `verify:package`.
- [x] T-002 [REQ-002, AC-002] Implement `fetchRegistryState` and test it with mocked responses (`UNIT-021`); record the real registry reading in `MANUAL-010`.
- [x] T-003 [REQ-003, AC-003] Return `skip` with bootstrap guidance for a missing package (`UNIT-020`) and write the bootstrap steps in the runbook (`MANUAL-011`).
- [x] T-004 [REQ-004, AC-004] Write `release.yml` with a single OIDC job, pinned actions, npm ≥ 11.5.1 preflight; assert it in `UNIT-022` and `UNIT-023`.
- [x] T-005 [REQ-005, AC-005] Implement `planRelease`, `checkPublished`, idempotent guards and GitHub Release repair; negative controls in `UNIT-020`.
- [x] T-006 [REQ-006, AC-006] Restrict triggers and conditions; invariants in `UNIT-023`; CI stays read-only.
- [x] T-007 [REQ-007, AC-007, AC-008] Build `apps/site` landing and copy command; `COMP-020`, `COMP-022`, `CONTRACT-030`.
- [x] T-008 [REQ-008, AC-009] Responsive, accessible CSS and menu; `COMP-021`, `E2E-030`.
- [x] T-009 [REQ-009, AC-010] Metadata, robots, sitemap, origin normalization; `UNIT-025`, `CONTRACT-031`, `CONTRACT-032`.
- [x] T-010 [REQ-010, AC-011] Add `deploy-site.yml`, Wrangler config and pinned dependency; `UNIT-023`, `CONTRACT-033`, `CONTRACT-034`.
- [x] T-011 [REQ-011, AC-012] Extend CI artifacts and test wiring, write the runbook, run `pnpm quality:gate` and record results (`MANUAL-012`, `MANUAL-013`).
