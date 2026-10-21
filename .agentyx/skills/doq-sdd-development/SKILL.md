---
name: doq-sdd-development
description: Spec-driven workflow for Doq changes - specify, define acceptance cases, pick test layers, implement, verify with real commands, and open one cohesive PR.
---

# Doq spec-driven development

Doq (`@doqs/analog`) is a published Angular/Analog library. Consumers depend on its public contract, so every
meaningful change starts from a written specification and ends with executed evidence.

## Workflow

1. **Inspect current `main`.** `git fetch origin`, branch from `origin/main`, read `AGENTS.md` and `CONTRIBUTING.md`.
2. **Identify the request** (a minor, a feature, a bug fix, or maintenance) and read existing specs in `docs/specs/`.
3. **Specify.** `pnpm sdd:new <milestone-id> <slug>` creates `docs/specs/<id>-<slug>/` with `spec.md`, `design.md`,
   `tasks.md` and `verification.md`. Fill in problem, scope, non-goals, `REQ-nnn` requirements, `AC-nnn` acceptance
   cases and public API impact.
4. **Choose test layers** per acceptance case: `UNIT` (Vitest, pure logic), `COMP` (Angular Testing Library,
   rendered component behavior), `E2E` (Playwright, real browser journeys), `CONTRACT` (pytest, packed artifact and
   HTTP output). Do not duplicate a check across layers without a reason.
5. **Implement** in small steps tied to `tasks.md`.
6. **Run tests**, fix real failures (do not weaken or skip tests), then run the regression gate.
7. **Review public API and docs.** Update `packages/doq/README.md` and `packages/doq/CHANGELOG.md` for public changes.
8. **Record evidence** in `verification.md`: the commands you ran, their actual results, and remaining limitations.
9. **Check the spec**: `pnpm sdd:check` must pass. It checks structure and references only; it does not prove behavior.
10. **Open one cohesive PR** using the PR template, with executed commands and real counts.

## Proportionality

- Meaningful API or behavioral changes: full four-document spec.
- Small fixes (typo, one-line bug): an abbreviated `spec.md` in the PR description is enough, but a bug fix still
  needs a regression test that fails without the fix.

## Commands

| Command                              | Purpose                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `pnpm sdd:new <id> <slug>`           | Scaffold a spec                                                  |
| `pnpm sdd:check`                     | Validate spec structure and traceability                         |
| `pnpm test:unit` / `test:components` | Vitest domain and Angular Testing Library tests                  |
| `pnpm test:contract`                 | pytest checks against the packed tarball and static HTTP output  |
| `pnpm test:e2e`                      | Playwright journeys against production builds                    |
| `pnpm verify:change`                 | Fast local gate (format, types, sdd, unit, components, contract) |
| `pnpm quality:gate`                  | Full pre-PR gate (adds builds, package check, E2E, MVP harness)  |

## Evidence rules

- Never claim a requirement is verified because the code exists; it is verified when a named test ran and passed.
- Never claim a provider activated a skill or MCP server unless you observed it. Configuration present is not
  activation.
- Report failures plainly with the command and output. Mark anything not run as UNVERIFIED.
- Do not call an AI model from the verification scripts; the gate is deterministic.
