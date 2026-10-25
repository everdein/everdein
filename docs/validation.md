# Profile validation

Run from the repository root with Node.js 24 or another supported runtime:

```bash
node --test tests/profile.test.mjs
node scripts/check-profile.mjs
```

The dependency-free checks verify referenced local image files, approved
asset/destination pairs, current role, and historical employer attribution.
`presence.json` records those public decisions from the current profile and
approved brand usage. Change it only when its owning public decision changes.
Current role, employer, and historical attribution are checked separately;
the checker does not approve new career claims or rewrite profile copy.

Profile validation runs on pull requests, pushes to `main`, and manual dispatch
through `.github/workflows/profile.yml`. It is a read-only validation job, not
an application build or a separate profile deployment. No package install or
private workflow repository is needed.

Local checks do not fetch LinkedIn, Drive, or Goodreads, verify remote
availability, compare approved image hashes, or replace a rendered-profile
review of crop, accessibility, and readability. Image validation checks basic
format signatures, not full image decoding. Verify actual outbound navigation
and current live content during publication.
