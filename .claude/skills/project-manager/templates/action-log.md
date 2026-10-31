# Action Log

Every task, bug fix and code action of the project that was done and verified, newest first. It continues [not-close.md](not-close.md): an item that closes there moves here in the change that closes it. Where the project stands today is [state.md](state.md). The rules that keep this file current are in the root [AGENTS.md](AGENTS.md), Project records.

## Entry format

```
- **<Title>** — what it is, in one line, linking the code or doc it touched.
  - Requested: who asked, when, where (a task) | Found: where and when (a bug). Verified: how.
  - Version: … · Committed: … · Pushed: … · Live: … · Channel: …
```

- **Version:** the release kind and label: `expected <label>` until it is released, then the label; a native build's version with its versionCode or buildNumber; `docs` for content a push publishes; `none` for tests, tooling, or work that never shipped. A tag proves a version, not a deploy.
- **Committed:** `yes` with the commit hash and subject (a group may list the subjects once at its head), or `no`.
- **Pushed:** `yes`, `no`, or `no remote` when the repository has none.
- **Live:** `no`, or where it runs: the release, update or deploy id, the build id and where it installs from, or the URL; `n/a` for work that never ships; one part per piece when only part is live.
- **Channel:** the environment it is live in (`production`, `staging`, `preview`); `—` while not live and for docs without one.
- `unknown` marks a value no record proves. Never guess one.
- An item the owner drops is logged as `- **Declined: <title>**`, its second line `Declined: <the owner's words>, <date>.`, with `Version: none` and `Live: n/a`.

Groups below are `##` headings, newest first, by release or by date and theme.
