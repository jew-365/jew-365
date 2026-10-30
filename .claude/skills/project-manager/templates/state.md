# Project State

Where <project name> stands now, on one page. Last updated <YYYY-MM-DD> at commit `<hash>`; <which facts were read live that day and with which read-only commands, and which come from another record, with that record's date>. This page points to the documents that own the details:

- Everything open: [not-close.md](not-close.md).
- Everything done, with its version, commit and where it is live: [action-log.md](action-log.md).
- <Every other owning document: a release log, runbooks, store records, the changelog.>

## TL;DR

- <What users run now: the version or release, per environment.>
- <What is committed but not live, and what its release waits for; or None.>
- <The nearest milestone and who acts on it; or None.>

## Version

- <The current version and the files that declare it.>
- <The main branch, the commit it is at, and its remote, or "no remote".>

## Environments and releases

| Environment | Latest release | Id | Released | Reaches |
| --- | --- | --- | --- | --- |
| <Environment name> | <Release label> | <Release id> | <Release date> | <Who or what runs it> |

## Distribution

| Artifact | Version | Where | Status |
| --- | --- | --- | --- |
| <Build, package or image> | <Version> | <Store track, registry or host> | <Status, with the date it was read> |

- <One bullet per channel with its blocker or milestone.>

## Committed, not live

- <What is committed but not released, its expected label, and the precondition its release needs; or None.>

## Next steps

1. <At most seven, ordered, each naming who acts.>
