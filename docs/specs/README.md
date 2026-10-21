# Doq specifications

Every meaningful change starts as a spec here: `docs/specs/<four-digit-id>-<slug>/` with `spec.md`, `design.md`, `tasks.md` and `verification.md`.

```sh
pnpm sdd:new 0002 my-change   # scaffold from scripts/sdd/templates
pnpm sdd:check                # structure and traceability; does not prove behavior
```

Traceability chain: `REQ-nnn` (requirement) → `AC-nnn` (acceptance case, observable) → verification case `UNIT-/COMP-/E2E-/CONTRACT-/SDD-/MANUAL-nnn` (a named test that appears in a test source, with its recorded result) and `T-nnn` tasks that point back at requirements. A verification case is `PASS` only when someone ran it and read the result.

[0001-oss-sdd-testing-foundation](0001-oss-sdd-testing-foundation/spec.md) is the reference example.
