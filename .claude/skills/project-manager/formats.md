# Record formats

The exact shape of each record. [records.mjs](records.mjs) checks the parts marked "checked"; the rest is for the writer. Examples are illustrations: write what the project's evidence says.

## not-close.md

### Layout

```markdown
# Not Closed

<One paragraph: what this file is, that closed items move to action-log.md, and that state.md says where the project stands.>

## Tasks

### High
- [ ] <task>

### Medium
- [ ] <task>

### Low
- [ ] <task>

## Bugs
- [ ] <bug>

## Open Questions
- **Q1 — <topic>**
  ...

## Other Open Items
- **<title>.** <what it is, what it waits for, who acts>
```

- The four `##` sections always exist, in this order (checked). An empty one says `None recorded.`
- A priority heading may carry a topic after a dash (`### High — Payments`), so a long backlog can group by theme inside each priority. A heading without High, Medium or Low (a batch header, below) holds rules, not items.
- Every open task and bug is a `- [ ]` line at the start of a line (checked). A `- [x]` line is an error: a closed item moves to `action-log.md`.
- **Closed, awaiting move.** When the owner holds the cleanup of closed items, the item stays and gains a first child line `- **Closed, awaiting move:** <date>, logged in action-log.md as "<entry title>".` The checker counts these apart from open work.

### Writing tasks

Decompose the source material (a request, plan, PRD, spec, another agent's step list, or the conversation) into tasks:

1. **Find the source.** Read the attached files and the conversation. When the user points to an earlier discussion that is not visible ("do it for what we discussed"), search whatever conversation history the environment offers before asking them to repeat it. When several sources exist (a PRD and a later reply that refines it), reconcile them and keep the most recent decision.
2. **Extract the work.** Strip motivation and prose; keep what has to be built, configured, written, tested or fixed.
3. **Make tasks atomic.** One focused sitting each, verifiable on its own. Split "build the auth system" into setup, schema, endpoints and UI. Each task's Expected result names its own test; a separate test task exists only when the source asks for a test suite or a test infrastructure.
4. **Prioritize by dependency and value.**
   - **High:** anything that blocks other work (setup, schemas, foundational APIs), the smallest part of the request that delivers its core value, and anything that loses or exposes data.
   - **Medium:** the parts of the request that can follow the core (a refresh flow after the login), secondary features, important but non-blocking integrations, tests beyond a smoke level.
   - **Low:** polish, optional integrations, ideas the source deferred ("maybe", "later"), documentation that does not block shipping.
   - When the source gives no priorities, say in the report that the ones you assigned are for the owner to confirm.
   - Inside one priority heading, tasks run in dependency order, then in the order of their source.
5. **Never invent.** A reader of the source must recognize each task as plainly implied. A choice the owner should make (product behaviour, cost, a vendor, a limit) becomes an open question. A technical choice with an obvious default that is cheap to reverse is a decision: write it into the task's What it is.
6. **Too little input** (a bare "make tasks" with no source): ask one focused question for the source, then continue.

Task shape (the three fields are required, checked):

```markdown
- [ ] <Short imperative title>
  - **Ships as:** <the release path it needs, when the project has more than one: hot update, native build, web deploy, migration, docs only>
  - **What it is:** <what gets built or changed, concretely: files, contracts, names>
  - **What it solves:** <the problem, requirement or source section it answers>
  - **Expected result:** <the verifiable outcome: the test, check or behaviour that proves it done>
  - **Requested:** <who asked, when, where: "the user, 2026-10-24, in chat" or "PRD §4">
  - **Source:** <only for an imported item: the old file it came from, in code, e.g. `TODO.md`>
```

- Titles are short and imperative: "Add rate limiting to the login endpoint", not "We should maybe look at rate limiting".
- **Ships as** is optional. Use it when the project ships through more than one path and the choice matters (an over-the-air update versus a store build).
- **Expected result** names a check that can fail: "a test that sends 11 logins in a minute gets a 429 on the 11th", not "works well". When the source leaves a value open, keep the check and mark only the open value (`a 429 once the limit is passed (the limit: unknown, see Q2)`), with that open question. A Low "maybe" idea may say `unknown — an idea, not specified yet` without a question.
- **Requested** is required per task unless a batch header carries it. For an imported item with no requester on record: `unknown (author <name>)` when git shows who wrote the line, else `unknown`.

### Batch header

Many tasks from one request share their rules under one heading, placed under `## Tasks` before the priority headings; the request's tasks then sit under priority headings that carry its name (`### High — JWT auth`, `### Medium — JWT auth`):

```markdown
### <Request name> — batch rules

- **Requested:** <who, when, where>
- **Decisions taken:** <product calls already made, so an executor makes none>
- **Declined:** <what was asked and decided against, with the date>
- **Done means:** <the checks every task of the batch passes: tests, docs, translations, review>
```

### Bugs

```markdown
- [ ] <Symptom-first title: "Saving a draft offline loses the last paragraph">
  - **Found:** <where and when: "Android emulator, 2026-10-25", "user report, 2026-10-20", "review of PR 41">
  - **What it is:** <symptom, steps to reproduce, the cause when known, with the file that holds it>
  - **What it solves:** <who is hurt and how>
  - **Expected result:** <the check that proves the fix, ideally a test that fails today>
```

Order bugs most severe first. A bug found while closing another item is its own entry.

### Open questions

A decision someone else owns, or a fact nobody has proven yet. The code keeps working on an assumption that lives in one named place:

```markdown
- **Q<n> — <topic>**
  - **Question:** <the one thing to decide or confirm>
  - **Assumption:** <what the code does until it is answered>
  - **Lives in:** <the one place a different answer changes: a function, a config key, a file; or "not built yet: task <title>">
  - **What it affects:** <the screens, users or data that depend on it>
```

For a document a third party reviews, add **Why it is not a structural change**: the assumption lives in one place and the raw input is kept, so a different answer is a replay or a one-line change, not a migration.

### Other open items

Reviews, external dependencies, unverified paths, cleanup, retiring an old file, and anything waiting on a person: `- **<title>.** <what it is, what it waits for, who acts next>`. A check that could not run when its item closed (another device, another environment) waits here, naming the log entry it completes. Keep only what is still open: done history belongs in the log.

## action-log.md

### Layout

```markdown
# Action Log

<One paragraph: everything done and verified, newest first; the continuation of not-close.md; state.md is today's picture.>

## Entry format
<the format block and field rules from the template>

## <YYYY-MM-DD> — <release or theme>

<optional group head: who asked, the commits with their subjects, the release it ships in, how it was verified>

### <Tasks | Bugs | Fixes found while verifying | Tooling>

- **<entry>**
```

- Groups are `##` headings, newest first, by release (`## 2026-10-23 — v2.4.0`) or by date and theme.
- Inside a large group, `###` subsections split tasks, bugs and the rest.
- A group head may list each commit's hash and subject once; its entries then name hashes only.

### Entry shape

```markdown
- **<Title>** — <what it is, one line, linking the code or doc it touched>.
  - Requested: <who, when, where> | Found: <where, when>. Verified: <tests, checks, runs or review that proved it>.
  - Version: <...> · Committed: <...> · Pushed: <...> · Live: <...> · Channel: <...>
```

The second line starts with `Requested:` or `Found:` and holds `Verified:` (checked). The third is the status line: its five fields, in this order, separated by ` · ` (checked).

| Field | Before | After |
| --- | --- | --- |
| Version | `<kind>, expected <label>`: `release, expected v2.5.0`, `OTA, expected 1.0.21-2` | the released label; `Build <version> (versionCode <n>)` for a native build; `docs` for content a push publishes; `none` for tests, tooling, or work that never shipped |
| Committed | `no` | `yes, <hash> <subject>` (checked: the hash exists), the hashes alone when the group head lists the subjects, or a range `` `<first>` to `<last>` `` for a run of commits |
| Pushed | `no` | `yes` (checked: a remote branch holds the commit); `no remote` when the repository has none |
| Live | `no` | where it runs: the release, update or deploy id, the build id with its version and where it installs from (store track, TestFlight, registry, direct download), or the URL; `n/a` for work that never ships; one part per piece when only part is live ("files on Pages; app: no") |
| Channel | `—` | `production`, `staging`, `preview`, or the environment's own name; `unknown` when Live is; `—` while not live and for docs without one |

- A tag proves a version, not a deploy: an entry tagged `v0.3.0` whose deployment no record shows has `Version: v0.3.0 · … · Live: unknown · Channel: unknown`. A group dated by a tag takes an annotated tag's date, or the tagged commit's date for a lightweight tag, and says which.
- `unknown` for any value no record proves; for a backfilled commit with no requester on record, `Requested: unknown (author <name>)`.
- A reverted or superseded item stays, says what replaced it, and has `Version: none`.
- A cross-reference entry (`- **B10** — see "..." under Tasks`) has no status line.

### Declined entries

An item the owner drops moves here too, so nothing open disappears without a trace:

```markdown
- **Declined: <title of the open item>** — <what it was, one line>.
  - Declined: <the owner's words, quoted>, <YYYY-MM-DD>. <The open questions removed with it, by number.>
  - Version: none · Committed: no · Pushed: no · Live: n/a · Channel: —
```

The second line starts with `Declined:` and needs no `Verified:` (checked). `Committed` and `Pushed` stay `no` unless code was written and kept.

### Backfill

- **Unreleased work**, the commits after the latest release (after the newest tag, or all of them without releases, capped at the last 50 commits or 30 days, whichever holds fewer commits): one entry per task, fix or code action.
- **The latest release:** one entry per item, in its own group.
- **Each older release:** one entry, listing its commits; its first commits count as part of it.
- **History before the first release**, or older than the window without releases: one entry per month.
- Merges and pure record edits get no entry; docs and tooling commits of a period may share one entry.
- Each fact from git, tags, the changelog, CI results or release notes; the rest `unknown`.

## state.md

### Layout

```markdown
# Project State

<Where the project stands, on one page. "Last updated YYYY-MM-DD at commit <hash>" (checked), and how the facts were read: which commands, which documents, and which facts were not re-read.>

- Everything open: not-close.md. Everything done: action-log.md. <Every other owning document: release log, runbooks, store records.>

## TL;DR
<three bullets: what users run now, what is committed and not live, the nearest milestone>

## Version
<the current version and where it is declared; the main branch, its commit, and its remote>

## Environments and releases
| Environment | Latest release | Id | Released | Reaches |

## Distribution
<stores, registries, hosting, direct downloads: a table of build or artifact, version, where, status; then one bullet per channel with its current blocker or milestone>

## Committed, not live
<what is committed but not released, with the expected label and the precondition its release needs>

## Next steps
1. <at most seven, ordered, each naming who acts>
```

- Every fact says when it was read; a fact copied from another record instead of read live says so and keeps that record's date.
- `unknown` in any cell no record proves; `None` when there is no milestone or nothing committed and not live.
- A live read that could not run goes into Next steps as the exact command and who runs it.
- Rename the sections and table headers to the project's words (a library has registries, not stores; a service has environments, not channels) and drop the ones that do not apply. A project with one environment and no separate artifacts (a single web service) keeps Environments and releases and drops Distribution, so one fact has one home.
- "Last updated … at commit" names the commit HEAD was at when the page was written; the commit that adds the page comes after it.
- Point to the owning document for details; never copy a release log or a backlog into this page.

### Reading live state

Read-only commands by release path. Run the ones the project uses; never their write counterparts.

| Release path | Read-only commands |
| --- | --- |
| Git and its host | `git log`, `git tag --sort=-creatordate`, `git remote -v`, `git branch -r --contains <hash>`, `git ls-remote --tags <remote>` (are the tags pushed), `gh release list`, `gh run list --branch <main>`; on GitLab `glab release list`, `glab ci list`. A CI file whose host cannot be read leaves CI results `unknown`. |
| Package registries | `npm view <name> version time`, `pip index versions <name>`, `cargo search <name>` |
| Containers and Kubernetes | `kubectl config current-context` first, then `kubectl get deploy -o wide` and `kubectl rollout history deploy/<name>`; `docker image ls` |
| Web hosting and PaaS | `vercel ls`, `netlify status`, `fly status -a <app>`, `fly releases -a <app>`, `heroku releases -a <app>`, `gcloud run revisions list --service <name>`, `curl -sI <url>` |
| Expo / EAS | `eas update:list --branch <branch> --json --non-interactive`, `eas channel:list`, `eas build:list --limit 10 --json --non-interactive` |
| App stores | the store consoles, read by the user or through a browser session the user opened; otherwise the project's release log, with its date |

## Updating after a step

| Step | action-log.md | state.md |
| --- | --- | --- |
| An item closes | the entry is added, `Committed: no`, the version `expected` | "Committed, not live" when it is user-visible |
| The owner holds the cleanup | the entry is added | — |
| The owner cancels an item | a `Declined: <title>` entry with the owner's words and date, `Version: none`, `Live: n/a` | Next steps, when it was one |
| Commit | `Committed: yes, <hash> <subject>` on every entry it carries | the commit it was written at, when it changes facts |
| Push | `Pushed: yes` | the main branch's position |
| Release, deploy, update | `Live: <id>`, `Channel: <env>`, the version without `expected` | the environment's row, TL;DR, "Committed, not live" |
| Rollback | each reverted entry says what replaced it | the environment's row |
| Build or upload | the build id, version and versionCode or buildNumber, where it installs from | Distribution |
| Review, tester or store milestone | — | Distribution, Next steps |
| Version raise | — | Version, and every row it changes |
