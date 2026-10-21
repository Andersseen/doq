# Security policy

## Supported versions

Doq (`@doqs/analog`) has not been published to npm yet. Security fixes are made on the `main` branch and the latest `0.1.x` line; older pre-release states are not supported.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a vulnerability

Please do **not** report security problems through public issues, pull requests or discussions: public reports can be read, cached and indexed before a fix exists.

1. Preferred: use GitHub's private vulnerability reporting — the **Report a vulnerability** button on the repository's [Security tab](https://github.com/Andersseen/doqs/security/advisories/new).
2. If that button is not available (see the note below), open an issue titled "Security contact request" that contains **no technical details**, or reach the maintainer, [@Andersseen](https://github.com/Andersseen), through the contact options on their GitHub profile. A private channel will be arranged.

> Maintainer note: as of this writing, private vulnerability reporting was **not enabled** on the repository (checked through the GitHub API). Enable it under _Settings → Code security → Private vulnerability reporting_ so the first path above works.

## What helps triage

- The affected version or commit, and the Angular, Analog and Node versions in use
- A minimal reproduction or the exact request/Markdown input that triggers the problem
- The observed impact (for example script injection through rendered Markdown, path traversal through `contentDirectory`/slugs, or leaking of private files into a published artifact)
- Whether the issue appears in server-side rendering, static generation, the browser, or the packed npm artifact

## What to expect

Reports are handled by a single volunteer maintainer, on a best-effort basis. There is no guaranteed response time. The intended process is to confirm and reproduce the report, develop and test a fix privately, publish the fix with a changelog entry (and an advisory when appropriate), and credit the reporter if they wish.

## Scope

In scope: the `@doqs/analog` package and the build/verification tooling in this repository. Vulnerabilities in Angular, Analog.js or other dependencies should be reported to their own maintainers.
