# AGENTS.md

## Purpose

- The design lab: a side project inside the repository where the owner's design requests become live, interactive prototypes that are built locally and shown to the owner as Artifacts. It covers the home screen, any other screen, a component or a flow.
- Every request gets its own study folder under [studies/](studies). A study is self-contained, so earlier studies keep building unchanged.

## Ownership

- [runtime/support.js](runtime/support.js) is the DC runtime of the claude.ai Design Artifact type (React 18 plus the `x-dc` template engine). It is shared by every study's boards and copied beside them at build time, and it is never edited.
- [tools/shot.mjs](tools/shot.mjs) takes a full-height screenshot of a built board with headless Edge.
- A study owns its sources, its data, its build scripts, its agent brief and the record of what it published.
- Production app code stays owned by [../../src/AGENTS.md](../../src/AGENTS.md). A study never imports app code at runtime and the app never imports a study; a study may read app libraries and data at build time, as the home study's `gen-data.mjs` does.

## Local Contracts

- A new design request means a new folder, `studies/<YYYY-MM-DD>-<topic>/`. Changing a published study in place is allowed only when the owner asks for a next round of that same study.
- A study holds:
  - `boards/<Name>.html`: one template per direction, in the `x-dc` format;
  - a shared core of logic and styles, so every board reads the same data and actions;
  - `build.mjs`: turns the boards into `out/project/*.dc.html`;
  - `assemble.mjs`: writes the gallery site into `out/site` and the canvas into `out/canvas/project` from one `dirs.json`;
  - `BRIEF.md`: the contract given to agents who build boards;
  - its own agents doc (like [studies/2026-10-27-home/AGENTS.md](studies/2026-10-27-home/AGENTS.md)): the study's purpose, the owner's picks and the published links.
- A new study starts from a copy of the closest existing study's core, build, assemble and site template, and then changes them. It never edits the older study's files.
- `out/` is build output and is never committed ([../../.gitignore](../../.gitignore)). Every published file is rebuilt from the sources.
- Each study publishes to two Artifacts, a Design canvas and a gallery site. Its agents doc records both links, so the next round updates the same links instead of creating new ones.
  - The canvas is published with `root` set to `out/canvas` and `file_path` set to `out/canvas/project/canvas.json`.
  - The site is published with `root` set to `out/site` and `file_path` set to `out/site/index.html`.
  - A board dropped from a study is removed in the next publish by passing `null` for its path.
- All data shown in a board is real or derived from the app's own rules. A board never invents a zman, a date or a name.
- On screen everything is Hebrew, RTL, with theme tokens, at least 44px tap targets and at least 12px text.

## Work Guidance

- The DC template rules that are easy to get wrong:
  - a text hole inside SVG `<text>` renders nothing;
  - every hole renders as `<span class="sc-interp">`, so use child selectors;
  - `onPointerDown`, `onPointerMove`, `onPointerUp` and the range input's `onChange` work.
- Agents who test boards in headless Edge close every browser they start. Leftover instances once reached about 480 processes and dropped several agents' connections. To clean up, filter with WQL on the temporary profile (`CommandLine LIKE '%user-data-dir=%Temp%'`).
- A hidden browser pane never loads lazy iframes: show the pane before checking a gallery page.

## Verification

- Inside a study folder:
  - `node build.mjs` builds every board;
  - `node assemble.mjs` writes the site and the canvas.
- Serve the build with the `design-site` launch configuration (port 8096, rooted at `design/`), then:
  - `node design/lab/tools/shot.mjs <study> <Board> "<hash>" <out.png>` takes a full-height screenshot;
  - the gallery opens at `/lab/studies/<study>/out/site/index.html`.

## Child DOX Index

- [studies/2026-10-27-home/AGENTS.md](studies/2026-10-27-home/AGENTS.md) - The home screen study of 2026-10-27: ten live, scrubbable directions on real data.
- [studies/2026-10-28-home-mix/AGENTS.md](studies/2026-10-28-home-mix/AGENTS.md) - The home screen study of 2026-10-28, round 4: five mixes of the owner's likes, for him to pick two (a default and an alternative).
