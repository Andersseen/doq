# Release and deployment runbook

Two independent pipelines, both started only by a **successful CI run** on `main`:

| Pipeline    | Workflow                            | Trigger                                                            | Publishes                                                                          |
| ----------- | ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| npm release | `.github/workflows/release.yml`     | CI succeeded for a push to `main`                                  | `@doqs/analog` when `packages/doq/package.json` holds a version that is not on npm |
| Website     | `.github/workflows/deploy-site.yml` | CI succeeded (push to `main` → production, same-repo PR → preview) | `apps/site/dist/analog/public` to Cloudflare Pages                                 |

Committed code cannot configure npm, Cloudflare or GitHub account settings. Every step marked **[owner]** below must be done by the account owner; until then the workflows skip safely and say so in their job summary. A skipped job is never a published or deployed release.

## Security boundaries

- Pull requests only run `ci.yml` (`contents: read`). No secrets, no `id-token`, no write permission.
- `release.yml` and `deploy-site.yml` start from `workflow_run`, so they run the workflow file from `main`. They act only when the CI run was a push to this repository's `main` (releases) or a same-repository branch (previews). Fork pull requests never reach them.
- The npm job is the only job with `id-token: write`, runs in the `npm-publish` environment, installs no dependencies and executes no repository build code; it publishes the exact tarball CI built and verified (checked by SHA-256 against the eligibility job).
- No npm token exists anywhere. npm authenticates the job through OIDC (Trusted Publishing) and attaches provenance automatically.
- Cloudflare uses a Pages-scoped API token held in GitHub environment secrets. Preview deployments run default-branch scripts only and treat the pull request's site as static data; they refuse worker/routing files and can never use the production branch.
- Third-party actions in the privileged workflows are pinned to commit SHAs (Dependabot's monthly `github-actions` group proposes updates).

## npm: version policy

`packages/doq/package.json` is the single source of truth. A release is a PR that bumps `version` (and the `CHANGELOG.md` section) and nothing else is needed: after merge and green CI, `release.yml` publishes it, tags `v<version>` at the validated commit and creates the GitHub Release from the changelog section. Only stable `x.y.z` versions are accepted; no major bump is ever automatic. Without a bump nothing is published.

## npm: first publication (bootstrap) — [owner]

State checked on 2026-10-21 with unauthenticated registry reads: `https://registry.npmjs.org/@doqs%2Fanalog` returns **404**, so `@doqs/analog` is **not published** (0.2.0 included). The organization page and your membership and 2FA settings cannot be read without your login; they are unverified. A Trusted Publisher can only be configured on an existing package, so the first version is published by hand:

```sh
git switch main && git pull --ff-only
pnpm install --frozen-lockfile && pnpm build && pnpm pack:doq
pnpm verify:package artifacts/doqs-analog-0.2.0.tgz
tar -tzf artifacts/doqs-analog-0.2.0.tgz          # inspect the contents
npm login                                           # your account, with 2FA, member of the doqs organization
npm publish artifacts/doqs-analog-0.2.0.tgz --access public
git tag -a v0.2.0 -m "@doqs/analog 0.2.0" <commit-that-was-built> && git push origin v0.2.0
```

Then: package page → **Settings → Trusted Publisher → GitHub Actions**: organization/user `Andersseen`, repository `doq`, workflow filename `release.yml`, environment `npm-publish`. Afterwards consider **Publishing access → Require two-factor authentication and disallow tokens**. The first OIDC publication happens with the next version bump; confirm it in the Actions summary and on the package page (provenance badge). Only after that, update the README's "Not yet published" line.

Note: a manual publication from a different build has a different tarball hash than CI's, so the workflow will not auto-create the GitHub Release for it (it reports "already on npm with different content"); creating the tag and release by hand, as above, completes it.

## npm: GitHub setup — [owner]

- Settings → Environments → create `npm-publish`. Optionally add required reviewers: then every publication waits for approval. Restrict deployment branches to `main`.
- Branch protection on `main`: require the CI checks and pull requests. The workflows do not weaken it.
- Settings → Actions → General: workflow permissions can stay read-only (jobs request what they need).

## npm: rollback, deprecation and recovery

- Published versions are immutable; `npm unpublish` is not a rollback. Fix forward with a new patch version.
- Problematic version: `npm deprecate @doqs/analog@0.2.1 "reason; use 0.2.2"` (needs your login). Move the `latest` tag with `npm dist-tag add @doqs/analog@<good> latest` if required.
- npm published but the GitHub Release failed: re-run the failed `github-release` job, or the next push to `main` re-plans it as `repair-github-release`. Nothing is republished.
- Publish job failed before `npm publish`: re-run it. `assert-unpublished` re-checks the registry and never publishes an existing version.
- Plan says "refuse" (tag exists for an unpublished version, tarball/version mismatch, version lower than latest): read the reason in the job summary, fix the tag or version, push again.

## Website: Cloudflare Pages — [owner]

The project is configured in `apps/site/wrangler.jsonc` (`name: doq-site`; change it there if you pick another name). Nothing was created in any Cloudflare account by this repository.

**Status on 2026-10-21 (checked during the 0.3.0 work).** The deploy runs for `main` failed with `The Pages project "doq-site" does not exist`. A read-only `wrangler pages project list` with the maintainer's local OAuth login showed no Pages project named `doq-site`, `doqs-site` or anything else containing `doq`, so the failure is an account state, not a build problem; the latest run (after PR #13) was skipped by its job conditions and was not investigated further. The repository contains no project name that is known to be right, so none was guessed and `wrangler.jsonc` still says `doq-site`. **Maintainer action:** create the Direct Upload project (step 1; keep `doq-site` or choose another name and change `apps/site/wrangler.jsonc` in the same PR), confirm the `CLOUDFLARE_ACCOUNT_ID` secret is the account that owns it, then re-run the failed workflow. Until then the site is **not deployed**. (npm, by contrast: `@doqs/analog@0.2.0` is `latest` on the public registry as of this check.)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Direct Upload** with that project name (or `pnpm --filter site exec wrangler pages project create doq-site --production-branch=main` after `wrangler login`). Do **not** connect the project to Git builds; Wrangler from GitHub Actions is the only deployer.
2. Note the **Account ID**. Create an **API token** (My Profile → API Tokens → custom) with only _Account → Cloudflare Pages → Edit_. Never use the Global API Key.
3. GitHub → Settings → Environments → create `cloudflare-pages-production` (restrict to `main`) and `cloudflare-pages-preview`. In each add secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Optional reviewers on the preview environment approve every preview.
4. Repository variable `DOQ_SITE_ORIGIN` (Settings → Variables) = the public origin, e.g. the `https://<project>.pages.dev` URL once known, or the custom domain later. It turns on canonical URL, `og:url` and `sitemap.xml`; unset, the site builds without them. No domain is hard-coded.
5. Merge to `main`; confirm the **Deploy site / production** summary says "Deployed", and open the Pages URL. A summary saying "NOT DEPLOYED" means credentials were missing.
6. Custom domain: Pages project → Custom domains. Update `DOQ_SITE_ORIGIN` afterwards.

Preview deployments use `--branch=<pr-branch>`, which Cloudflare treats as preview (production is `--branch=main` only). The site links to `npmjs.com/package/@doqs/analog`, which resolves only after the first publication: deploy production after the bootstrap.

Local work needs none of this: `pnpm dev:site`, `pnpm --filter site build`, `pnpm --filter site preview`. To deploy by hand: `pnpm --filter site build && pnpm --filter site exec wrangler pages deploy --branch=<name>` after `wrangler login`.
