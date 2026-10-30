# Project Manager

A vendor-neutral agent skill, `project-manager`: [SKILL.md](SKILL.md) is the entry point, written as plain instructions with no tool names of any agent product.

Use it with any agent:

- Claude Code: keep this folder in `~/.claude/skills/` (or a repository's `.claude/skills/`).
- OpenAI Codex: copy it to `~/.codex/skills/`.
- A repository shared by several agents: copy it to `.agents/skills/` in the repository.
- Any other agent: tell it "read `<path>/SKILL.md` and follow it", or paste the file.

The optional checker needs Node 18 or later: `node records.mjs check <repo>` and `node records.mjs summary <repo>`.
