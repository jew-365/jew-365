---
name: project-manager
description: The one skill for tasks and project records. Use it whenever the user asks to create, add or list tasks, or hands over a plan, PRD, spec, roadmap, an agent's step list or an earlier discussion to act on, even without the word "task"; tasks go into not-close.md, never into a tasks.md. It keeps three records at the repository root - not-close.md (open tasks, bugs, questions and items), action-log.md (work done and verified, with version, commits, push and where it is live) and state.md (where the project stands) - bound to every agent by the root AGENTS.md, created if missing. Also use it to set the records up, report the project state, log a bug or question, close or drop an item, or update the records after a commit, push or release. Triggers - "create a task", "turn this plan into tasks", "do it for what we discussed", "what is the project state", "log this bug", "close this task", "תיצור משימה", "תוסיף משימה", "תפרק את התוכנית למשימות", "מה המצב בפרויקט", "תרשום באג", "תסגור את המשימה".
---

# Project Manager

Three Markdown files at the repository root and one section of the root `AGENTS.md` hold the project's working memory, so any agent or person can answer three questions without asking anyone:

| File | Holds | Answers |
| --- | --- | --- |
| `not-close.md` | every open item: tasks, bugs, open questions, other open items | What is left, and in what order? |
| `action-log.md` | every item done and verified, newest first, with its version, commits, push, and where and on which channel it is live | What was done, and where is it now? |
| `state.md` | one page: the version, the latest release per environment, distribution, what is committed but not live, the next steps | Where do we stand today? |
| `AGENTS.md`, section "Project records" | the binding rules that keep the three current | How does every agent keep them true? |

The skill is vendor-neutral. It is plain Markdown and generic steps, and it names no tool of any agent product: "read", "search", "run a read-only command" and "ask the user" mean whatever the environment provides. `AGENTS.md` is the cross-vendor instruction file, so the rules bind agents that never load this skill.

Files beside this one:

- [formats.md](formats.md): the exact shape of every entry, how to write tasks, how to read live state, what each release step updates.
- [templates/](templates): starting files: `not-close.md`, `action-log.md`, `state.md`, `agents-section.md` (the section for an existing `AGENTS.md`) and `agents-minimal.md` (a new `AGENTS.md`).
- [records.mjs](records.mjs): an optional checker with no dependencies (Node 18 or later). `node <skill-dir>/records.mjs check <repo>` reports missing files, dead links and anchors, links to uncommitted files, unfilled template placeholders, malformed items, questions and entries (Declined ones included), dangling "see Q<n>" references, old open-work files not yet retired, and hashes git does not have or no remote branch holds. `node <skill-dir>/records.mjs summary <repo>` counts open and pending work, lists open items whose title matches a log entry, compares `state.md` with HEAD, and lists recent commits the log does not name (`--all` for every commit). Without Node, do the same checks by hand.

## Rules that never bend

1. **Evidence only.** Every fact comes from a file, git, a read-only command, or the user's own words in this conversation. A value nothing proves is written `unknown`, with what would prove it. A fact a record already holds keeps its read date ("12 testers, per the release log of 2026-10-24, not re-read"); it is not `unknown` just because it was not read again today. Never guess a version, id, date, status or result.
2. **Change nothing but the records.** This skill never commits, pushes, tags, publishes, deploys, builds, submits, migrates or runs any command that changes state outside the record files. Commands run for facts only read (`list`, `view`, `status`, `log`, `get`, `describe`, `curl -sI`); the project's own test, lint and type-check commands may run for evidence. The records are committed only when the user asks.
3. **One home per fact.** Open work lives only in `not-close.md`, done work only in `action-log.md`, today's status only in `state.md`, which points to the owning documents instead of copying them. Never create `tasks.md`, `TODO.md`, `BUGS.md` or a similar file beside them; an existing one is imported and retired (step 2.5).
4. **Closing is moving.** An item leaves `not-close.md` only in the change that closes it, and only into `action-log.md`. It is closed when its expected result was checked; a check that could not run yet (another device, another environment, the owner's review) stays behind as an Other Open Item that names it. Never delete or move an open item the user has not agreed is closed. When the user holds the cleanup, mark the item `Closed, awaiting move` ([formats.md](formats.md)) and wait.
5. **Same pass.** A record update belongs to the change or step that caused it, never to a later cleanup.
6. **Languages and links.** Write the records in English unless the project's existing docs are in another language; then match them. Report to the user in the user's language. Every reference to a repository file or folder that exists and is committed, or is committed with the records, is a relative Markdown link that resolves from the file it is in; a planned file, an untracked one and an old file about to be retired are named in code (`src/auth.js`) instead. Relative dates the user gives ("this morning") are written as absolute dates.
7. **Adapt, don't impose.** When the project already keeps these records in another complete shape (a `**Flag:**` field in place of `**Ships as:**`, a different section name), follow it and propose any change; never rewrite a working record wholesale.
8. **Shared working trees.** Other agents or people may be editing the same tree. Touch only the record files and `AGENTS.md`; never log another party's uncommitted work as done; and never let a record link a file that will not be committed with it (`records.mjs check` warns about links to untracked files).

## Step 1: detect the mode

Read the repository root, including whether `AGENTS.md` exists and has the Project records section (2.2 adds it in every mode).

- **None of the three files:** Bootstrap (step 2). When the user only asked for tasks, bootstrap first, then record the tasks (step 4) in the new `not-close.md`.
- **Some of them:** create the missing ones as in step 2, then Status (step 3) for the rest.
- **All three:** read them, then Record (step 4) if the user asked to record something, otherwise Status (step 3). A large record is read section by section; run `records.mjs summary` first, so its counts and matches tell you where to look.

Another open-work file at the root (`tasks.md`, `TODO.md`, `TODO`, `BUGS.md`, `ROADMAP.md`, `issues.md`) or a to-do section in the README means an import (step 2.5).

## Step 2: bootstrap

**2.1 Gather evidence**, read-only:

- **What the project is:** the README, the root manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `*.csproj`, `pom.xml`, `app.json` / `app.config.*`), the license.
- **How it ships:** version fields, tags (`git tag --sort=-creatordate`), a changelog, CI and CD configs (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`), deploy and release configs (Dockerfile, Kubernetes or Helm files, `vercel.json`, `netlify.toml`, `fly.toml`, `eas.json`, fastlane), release scripts.
- **History:** `git log --no-merges --date=short --format="%h %ad %an %s"`, `git status --short`, the current branch, `git remote -v`. With a remote: ahead and behind (`git rev-list --left-right --count HEAD...@{u}`) and `git branch -r --contains <hash>` to prove a push. Without one, every `Pushed` field is `no remote` and `state.md` says so.
- **Open work:** existing task and bug files, `TODO` / `FIXME` comments (`git grep -n -E "TODO|FIXME"`; summarize them into items, never one item per comment), the issue tracker when a read-only command for it exists (`gh issue list`), and what the user said in this conversation.
- **Live state:** the read-only commands of the project's release path ([formats.md](formats.md), Reading live state). When one needs a login, the network or a missing tool, write `unknown` and put the exact command in `state.md` Next steps and in the report.
- **Health:** run the project's test, lint and type-check commands once when they are cheap; a missing test suite or a command that cannot run is a finding with its output as evidence.

**2.2 The root `AGENTS.md`.**

- It exists: read it fully. Add the section of [templates/agents-section.md](templates/agents-section.md) where release or workflow rules live (adjust its heading level to fit), link the three files wherever it maps the repository's files, and fix any sentence the new rules contradict (for example "delete an item when it closes" becomes "move it to action-log.md"). Keep its style.
- It is missing: create it from [templates/agents-minimal.md](templates/agents-minimal.md), filled only from evidence, with the section's text pasted where the template says.
- A vendor-specific instruction file (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.windsurfrules`) that does not point at `AGENTS.md`: propose one line that does, and edit it only on the user's yes.
- If the project runs a docs checker (a links or structure check named in `AGENTS.md` or the package scripts), the new section and links must pass it.

**2.3 Write `not-close.md`** from [templates/not-close.md](templates/not-close.md) with the open items the evidence shows, written as [formats.md](formats.md) describes, including every open item of an old open-work file (2.5). When the source gives no priority, assign one by the heuristics there and tell the user the priorities are theirs to confirm. Real findings made while gathering (no tests, a command that cannot run) may become Other Open Items, each with its evidence. A section with nothing in it says `None recorded.`

**2.4 Write `action-log.md`** from [templates/action-log.md](templates/action-log.md), newest first ([formats.md](formats.md), Backfill): one entry per item for unreleased work and for the latest release, one entry per release before that, and one entry per month for history without releases. Backfilled history may carry `Verified: unknown`; it records what happened, not a new claim. A done item of an old file that a backfilled entry already covers adds a note to that entry, not a second one. Setting up the records gets no entry of its own, and neither does retiring an old file: record edits are not work.

**2.5 Import and retire an old open-work file.** Its open items go into `not-close.md` (2.3), each with `**Source:**` naming the file; its done items go into `action-log.md` (2.4). The file itself stays, with an Other Open Item `Retire <file>`: its items now live in `not-close.md`, and deleting it or leaving a one-line pointer is the owner's call. Name the old file in code (`TODO.md`), never as a link, so its deletion leaves no dead link. On the user's yes, delete the file (a file deletion, no git command) and remove the Retire item; `records.mjs check` warns about the old file until then, which is expected.

**2.6 Write `state.md`** from [templates/state.md](templates/state.md): the facts read now, the date, the commit it was written at, and how each fact was read.

**2.7 Verify** (step 5), then report in the user's language: the files created or changed; the counts of open items by kind and of log entries; every `unknown` with the command or person that can settle it; the provisional priorities; and the proposals waiting for a yes.

## Step 3: status

**3.1 Summarize.** Run `node <skill-dir>/records.mjs summary <repo>` (add `--all` for the whole history). Without Node, gather by hand: the open items by kind and priority, the items awaiting a move, open items whose title matches a log entry, the log entries pending a release, a commit or a push, the commit `state.md` was written at against HEAD, and the recent commits the log does not name.

**3.2 Re-read live facts** read-only, as in 2.1, and compare them with `state.md`. What cannot be read now keeps its recorded date.

**3.3 Look for drift**, each finding with its evidence:

- **Open items that are closed:** an open item whose title or id matches a log entry (the summary lists title matches), or whose expected result a commit or the code now meets. Propose moving it; when its log entry exists, the proposal is "remove block X, logged at action-log.md line N".
- **Unlogged work:** commits the log does not name (merges and pure record edits need no entry; group docs and tooling commits into one entry).
- **Lagging fields:** `Committed: no` though the commit exists, `Pushed: no` though a remote branch holds it, `Live: no` or an `expected` version though a release since carries it.
- **Homeless checks:** a log entry whose Verified line says a path was not checked ("not checked on an iPhone") with no Other Open Item tracking that check.
- **Stale state:** a `state.md` fact that a live read or a newer record contradicts, or a `state.md` written at an older commit than HEAD with commits of work since (the summary counts them, record edits excluded).
- **Stale open items:** facts inside an open item that newer records contradict, and done history inside an Other Open Item that belongs in the log.
- **Rules drift:** an `AGENTS.md` without the Project records section, or one whose section lost a rule of [templates/agents-section.md](templates/agents-section.md).
- **Hygiene:** a `- [x]` item, an entry missing a field, a dead link or anchor, a link to an uncommitted file (`records.mjs check`).

**3.4 Report to the user**, in the user's language, in this order:

1. **The state:** the version; the latest release per environment (a short table when there are several); what is committed but not live; what is not committed yet.
2. **Open work:** counts by kind and priority, raw and after removing the items found closed; then the top items, ranked by `state.md` Next steps, then priority.
3. **Drift:** each finding with its evidence.
4. **Proposed writes:** numbered and grouped by file, one decision per cause (thirty closed items are one proposal, with the list), each a ready entry or a precise change. Mark the ones that wait for the user's word under rule 4.

Write nothing in status mode until the user approves; then write exactly the approved items and run step 5. A status run with no approved writes skips step 5.

## Step 4: record

- **Tasks from a request, plan, PRD, spec or another agent's plan:** [formats.md](formats.md), Writing tasks. Atomic, prioritized, the three required fields, and who asked (per task, or once in a batch header). A gap becomes an open question, never an invented task. They go into `not-close.md`, never into a new tasks file.
- **A bug:** the Bugs section, with where and when it was found, the symptom, the cause when known, and the check that will prove the fix.
- **An open question, an external dependency, a review or an unverified path:** Open Questions or Other Open Items.
- **Closing an item:** remove it from `not-close.md` and add its log entry in the same change, its version `expected` until it is released and `Committed: no` until the commit exists. When the user holds the cleanup, add its log entry and mark the open item `Closed, awaiting move` instead of removing it.
- **Cancelling an item:** when the owner drops an item, it moves too, as a `Declined: <title>` entry that quotes the owner's decision and its date ([formats.md](formats.md), Declined entries). An open question that existed only for that item goes with it, named in the entry; question numbers are never reused or renumbered; leftovers of the idea (a stub file) become an Other Open Item. Nothing open disappears without a trace.
- **Recording tasks or bugs** changes `state.md` only when it changes a fact there or its Next steps, which list blockers and decisions waiting on someone first, then the highest-priority work.
- **After a step** (commit, push, release, deploy, rollback, build, upload, store review, environment change): update every log entry the step carries and `state.md` in the same pass ([formats.md](formats.md), Updating after a step). An entry cannot name the commit that adds it: write the hash right after the commit, and that edit travels with the next commit, or with a records-only commit the user approves.
- **Committing the records,** when the user asks: stage the record files by path (and only the hunks of `AGENTS.md` that belong to the records when others edited it too), never everything in the tree.

## Step 5: verify before saying done

1. `node <skill-dir>/records.mjs check <repo>` exits 0. Read every warning and fix each real one.
2. Run the project's own docs checks, if it has any.
3. Read each changed record from top to bottom: no invented value, every `unknown` explained, every link resolving, `not-close.md` holding only open items (or ones marked awaiting a move), `action-log.md` only done and verified ones, or declined ones.
4. Report what stayed unverified.
