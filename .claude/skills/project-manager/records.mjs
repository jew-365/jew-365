#!/usr/bin/env node
// Checks and summarizes the project records of a repository: not-close.md, action-log.md and
// state.md at its root, and the Project records section of its AGENTS.md.
//
// Usage:
//   node records.mjs check   [repo]          errors and warnings; exits 1 on any error
//   node records.mjs summary [repo] [--all]  open and pending work, drift hints, unlogged commits
//
// No dependencies; Node 18 or later. It only reads files and runs read-only git commands.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const command = args[0] ?? 'summary';
const allHistory = args.includes('--all');
const rootArg = args.slice(1).find((arg) => !arg.startsWith('--')) ?? '.';
if (!['check', 'summary'].includes(command)) {
  console.error('Usage: node records.mjs <check|summary> [repo] [--all]');
  process.exit(2);
}

const root = path.resolve(rootArg);
const RECORDS = ['not-close.md', 'action-log.md', 'state.md'];
const RECORD_PATHS = new Set([...RECORDS, 'AGENTS.md'].map((name) => path.resolve(root, name)));
const OLD_OPEN_WORK = new Set(['tasks.md', 'todo.md', 'todo', 'todo.txt', 'bugs.md', 'roadmap.md', 'issues.md', 'backlog.md']);
const untrackedLinks = new Map();
const SECTIONS = ['tasks', 'bugs', 'open questions', 'other open items'];
const STATUS_FIELDS = ['Version', 'Committed', 'Pushed', 'Live', 'Channel'];
const HTML_TAGS = new Set(
  'a abbr b br code del details div em h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p picture pre q s samp small source span strong sub summary sup table tbody td th thead tr u ul video audio iframe'.split(' '),
);
const STOPWORDS = new Set(
  'the and for with its from that this into when after not are was one all any add fix make keep show use let new does every only own too than then there their them can will has have been but our out off now how why what who which while also each per via'.split(' '),
);
// A commit hash in code (`6216940`) counts whatever its digits; a bare one needs a digit and a
// letter, so words like "defaced" and plain numbers never pass for hashes.
const hashesIn = (text) => [
  ...[...text.matchAll(/`([0-9a-f]{7,40})`/g)].map((match) => match[1]),
  ...(text.match(/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g) ?? []),
];
const errors = [];
const warnings = [];

const git = (...gitArgs) => {
  try {
    return execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).trimEnd();
  } catch {
    return null;
  }
};
const lines = (text) => (text ? text.split('\n').filter(Boolean) : []);

const top = git('rev-parse', '--show-toplevel');
const inGit = top !== null;
const tracked = new Set(inGit ? lines(git('ls-files', '--full-name')) : []);
const trackedDirs = new Set();
for (const file of tracked) {
  for (let dir = path.posix.dirname(file); dir !== '.'; dir = path.posix.dirname(dir)) trackedDirs.add(dir);
}
const repoPath = (absolute) => path.relative(path.resolve(top ?? root), absolute).split(path.sep).join('/');
const isTracked = (absolute) => {
  const rel = repoPath(absolute);
  return tracked.has(rel) || trackedDirs.has(rel.replace(/\/$/, ''));
};
const allCommits = inGit ? lines(git('rev-list', '--all')) : [];
const remoteCommits = new Set(inGit ? lines(git('rev-list', '--remotes')) : []);
const remotes = inGit ? lines(git('remote')) : [];
const resolveHash = (short) => allCommits.find((full) => full.startsWith(short)) ?? null;
// "`a1b2c3d` to `e4f5a6b`" (or `a..b`) names every commit from the first to the last, both included.
const rangesIn = (text) =>
  [...text.matchAll(/`([0-9a-f]{7,40})`\s*(?:to|\.\.)\s*`([0-9a-f]{7,40})`/g)].flatMap(([, first, last]) => {
    const chain = inGit ? lines(git('rev-list', '--reverse', last)) : [];
    const start = chain.findIndex((full) => full.startsWith(first));
    return start < 0 ? [] : chain.slice(start);
  });

const read = (name) => {
  const file = path.join(root, name);
  return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
};

// Code fences and code spans are samples, not content: blank them out but keep every line and
// column, so line numbers in messages stay true.
const stripCode = (text) =>
  text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// GitHub's heading anchors: lower case, punctuation dropped, each space a hyphen, repeats numbered.
const anchorCache = new Map();
function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const anchors = new Set();
  const counts = new Map();
  const body = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/```[\s\S]*?```/g, '');
  for (const match of body.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = match[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    anchors.add(seen ? `${base}-${seen}` : base);
  }
  anchorCache.set(file, anchors);
  return anchors;
}

function checkLinks(name, text) {
  const body = stripCode(text);
  const self = path.join(root, name);
  for (const match of body.matchAll(/\[[^\]]*\]\(\s*(?:<([^>]*)>|([^)\s]*))(?:\s+"[^"]*")?\s*\)/g)) {
    const raw = (match[1] ?? match[2] ?? '').trim();
    if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const at = `${name}:${lineOf(body, match.index)}`;
    const [targetPart, anchor] = raw.split('#');
    const target = targetPart ? path.resolve(root, path.dirname(name), decodeURIComponent(targetPart)) : self;
    if (!fs.existsSync(target)) {
      errors.push(`${at}: dead link -> ${targetPart}`);
      continue;
    }
    if (anchor && target.endsWith('.md') && !anchorsOf(target).has(decodeURIComponent(anchor).toLowerCase())) {
      errors.push(`${at}: no heading for anchor #${anchor} in ${targetPart || name}`);
    }
    // The records and AGENTS.md are committed together by definition, so links among them are fine.
    if (inGit && targetPart && !isTracked(target) && !RECORD_PATHS.has(path.resolve(target))) {
      const key = repoPath(target);
      const seen = untrackedLinks.get(key) ?? { first: at, count: 0, ignored: git('check-ignore', '-q', target) !== null };
      seen.count += 1;
      untrackedLinks.set(key, seen);
    }
  }
}

function reportUntrackedLinks() {
  for (const [target, { first, count, ignored }] of untrackedLinks) {
    const where = `${first}${count > 1 ? ` and ${count - 1} more place(s)` : ''}`;
    warnings.push(
      ignored
        ? `${where}: links ${target}, which git ignores; the link is dead in a fresh clone`
        : `${where}: links ${target}, which git does not track yet; commit them together`,
    );
  }
}

function checkPlaceholders(name, text) {
  const body = stripCode(text);
  for (const match of body.matchAll(/(?<![(\[\w])<(?![/!])([^<>\n]{1,100})>/g)) {
    const inner = match[1].trim();
    const tag = /^([a-zA-Z][a-zA-Z0-9-]*)(\s+[a-z-]+=.*)?\/?$/.exec(inner);
    if (/^[a-z][a-z0-9+.-]*:/i.test(inner) || inner.includes('@') || (tag && HTML_TAGS.has(tag[1].toLowerCase()))) continue;
    warnings.push(`${name}:${lineOf(body, match.index)}: unfilled template placeholder <${inner}>`);
  }
}

const words = (title) =>
  new Set(
    title
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 3 && !STOPWORDS.has(word)),
  );

function parseNotClose(text) {
  const result = {
    tasks: { high: 0, medium: 0, low: 0, unprioritized: 0 },
    bugs: 0,
    questions: 0,
    other: 0,
    awaiting: 0,
    items: [],
  };
  const order = [];
  const raw = text.split('\n');
  const questions = [];
  result.otherText = [];
  let section = '';
  let priority = 'unprioritized';
  let item = null;
  let question = null;
  stripCode(text)
    .split('\n')
    .forEach((line, index) => {
      const h2 = /^## (.+)/.exec(line);
      if (h2) {
        section = h2[1].trim().toLowerCase();
        const known = SECTIONS.find((name) => section.startsWith(name));
        if (known && !order.includes(known)) order.push(known);
        priority = 'unprioritized';
        item = null;
        question = null;
        return;
      }
      const h3 = /^### (.+)/.exec(line);
      if (h3) {
        const heading = h3[1].toLowerCase();
        priority = ['high', 'medium', 'low'].find((level) => new RegExp(`\\b${level}\\b`).test(heading)) ?? 'unprioritized';
        item = null;
        question = null;
        return;
      }
      const box = /^- \[( |x|X)\] (.+)/.exec(line);
      if (box) {
        const title = /^- \[.\] (.+)/.exec(raw[index])[1].replace(/`/g, '').trim();
        item = { section, priority, title, checked: box[1] !== ' ', line: index + 1, body: [] };
        result.items.push(item);
        return;
      }
      if (/^\S/.test(line)) {
        item = null;
        question = null;
        if (section.startsWith('open question') && /^- \*\*/.test(line)) {
          result.questions += 1;
          question = { line: index + 1, title: raw[index].replace(/^- \*\*(.*?)\*\*.*$/, '$1'), body: [] };
          questions.push(question);
        }
        if (section.startsWith('other') && /^- /.test(line)) {
          result.other += 1;
          result.otherText.push(raw[index]);
        }
        return;
      }
      if (item) item.body.push(line);
      else if (question) question.body.push(line);
    });

  const ids = new Set(questions.map((entry) => /^([A-Z]\d+)\b/.exec(entry.title)?.[1]).filter(Boolean));
  for (const entry of questions) {
    const body = entry.body.join('\n');
    if (/\*\*Question:\*\*/.test(body)) {
      for (const field of ['Assumption', 'Lives in']) {
        if (!body.includes(`**${field}:**`)) warnings.push(`not-close.md:${entry.line}: question "${entry.title}" lacks **${field}:**`);
      }
    } else {
      warnings.push(`not-close.md:${entry.line}: question "${entry.title}" lacks **Question:**`);
    }
  }
  const plain = stripCode(text);
  for (const match of plain.matchAll(/\bsee (Q\d+)\b/g)) {
    if (!ids.has(match[1])) warnings.push(`not-close.md:${lineOf(plain, match.index)}: "see ${match[1]}" names no open question`);
  }

  const missing = SECTIONS.filter((name) => !order.includes(name));
  if (missing.length) warnings.push(`not-close.md: missing section(s): ${missing.map((name) => `"## ${name}"`).join(', ')}`);
  else if (order.join() !== SECTIONS.join()) warnings.push(`not-close.md: sections should run ${SECTIONS.join(', ')}`);

  for (const entry of result.items) {
    const at = `not-close.md:${entry.line}`;
    const body = entry.body.join('\n');
    entry.awaiting = /\*\*Closed, awaiting move:\*\*/.test(body);
    if (entry.checked) {
      errors.push(`${at}: checked item "${entry.title}" still here; a closed item moves to action-log.md`);
      continue;
    }
    if (entry.awaiting) {
      result.awaiting += 1;
      continue;
    }
    if (entry.section.startsWith('task')) {
      result.tasks[entry.priority] += 1;
    } else if (entry.section.startsWith('bug')) {
      result.bugs += 1;
      if (!/\*\*Found:\*\*|\bFound (on|by|in|during|while)\b/i.test(body)) {
        warnings.push(`${at}: bug "${entry.title}" does not say where and when it was found`);
      }
    } else {
      warnings.push(`${at}: open item "${entry.title}" sits outside Tasks and Bugs`);
      continue;
    }
    for (const field of ['What it is', 'What it solves', 'Expected result']) {
      if (!body.includes(`**${field}:**`)) warnings.push(`${at}: "${entry.title}" lacks **${field}:**`);
    }
  }
  return result;
}

function parseActionLog(text) {
  const result = {
    entries: 0,
    expected: 0,
    notLive: 0,
    liveUnknown: 0,
    notCommitted: 0,
    notPushed: 0,
    withUnknown: 0,
    named: new Set(
      text
        .split('\n')
        .filter((line) => /^\s*- `[0-9a-f]{7,40}`/.test(line))
        .flatMap((line) => hashesIn(line)),
    ),
    titles: [],
  };
  // Structure comes from the text with code blanked out (so the format sample in a fence is not
  // an entry); the fields come from the raw line, because hashes sit inside code spans.
  const raw = text.split('\n');
  const blocks = [];
  let block = null;
  stripCode(text)
    .split('\n')
    .forEach((line, index) => {
      if (/^- \*\*/.test(line)) {
        block = { title: raw[index].replace(/^- \*\*(.*?)\*\*.*$/, '$1').replace(/`/g, ''), line: index + 1, children: [] };
        blocks.push(block);
      } else if (/^\S/.test(line)) {
        block = null;
      } else if (block) {
        block.children.push({ text: raw[index], line: index + 1 });
      }
    });

  for (const entry of blocks) {
    const at = `action-log.md:${entry.line}`;
    const status = entry.children.find((child) => /^\s+- Version:/.test(child.text));
    const described = entry.children.find((child) => /^\s+- (Requested|Found|Declined):/.test(child.text));
    const declined = /^Declined:/i.test(entry.title) || /^\s+- Declined:/.test(described?.text ?? '');
    if (!status) {
      if (described) warnings.push(`${at}: "${entry.title}" has no status line`);
      continue;
    }
    result.entries += 1;
    result.titles.push({ title: entry.title, line: entry.line, words: words(entry.title) });
    if (!described) warnings.push(`${at}: "${entry.title}" lacks its Requested: or Found: line`);
    else if (!declined && !/\bVerified:/.test(described.text)) warnings.push(`${at}: "${entry.title}" does not say how it was verified`);

    const fields = {};
    for (const part of status.text.trim().replace(/^- /, '').split(' · ')) {
      const field = /^(\w+):\s*(.*)$/.exec(part.trim());
      if (field) fields[field[1]] = field[2].trim();
    }
    if (STATUS_FIELDS.some((key, i) => Object.keys(fields)[i] !== key)) {
      warnings.push(`action-log.md:${status.line}: status line should read ${STATUS_FIELDS.join(' · ')}`);
    }
    const { Version = '', Committed = '', Pushed = '', Live = '' } = fields;
    for (const hash of [...hashesIn(Committed), ...rangesIn(Committed)]) result.named.add(hash);
    const shipsNothing = /^none\b/i.test(Version) || /^n\/a\b/i.test(Live);
    if (declined && !(/^none\b/i.test(Version) && /^n\/a\b/i.test(Live))) {
      warnings.push(`action-log.md:${status.line}: a Declined entry has Version: none and Live: n/a`);
    }
    if (/\bexpected\b/i.test(Version)) result.expected += 1;
    if (!shipsNothing && Live.split(';').some((part) => /^no\b|\bno$/i.test(part.trim()))) result.notLive += 1;
    if (!shipsNothing && /^unknown\b/i.test(Live)) result.liveUnknown += 1;
    if (!shipsNothing && /^no\b/i.test(Committed)) result.notCommitted += 1;
    if (!shipsNothing && /^no$/i.test(Pushed)) result.notPushed += 1;
    if ([described?.text ?? '', status.text].some((value) => /\bunknown\b/i.test(value))) result.withUnknown += 1;

    if (/^yes\b/i.test(Committed) && inGit) {
      const hashes = [...new Set(hashesIn(Committed))];
      if (!hashes.length) warnings.push(`action-log.md:${status.line}: Committed: yes names no commit hash`);
      for (const hash of hashes) {
        const full = resolveHash(hash);
        if (!full) warnings.push(`action-log.md:${status.line}: commit ${hash} is not in this repository`);
        else if (/^yes\b/i.test(Pushed) && !remoteCommits.has(full)) {
          warnings.push(
            `action-log.md:${status.line}: Pushed: yes, but ${remotes.length ? 'no remote branch holds' : 'there is no remote for'} ${hash}`,
          );
        }
      }
    }
  }
  return result;
}

function checkAgents(text) {
  if (text === null) {
    warnings.push('AGENTS.md: missing; the rules that keep the records current belong there');
    return { exists: false, section: false };
  }
  const section = /^#{2,4} Project records\b/im.test(text);
  if (!section) warnings.push('AGENTS.md: no "Project records" section');
  for (const name of RECORDS) {
    if (!new RegExp(`\\]\\(\\s*<?(\\./)?${name.replace('.', '\\.')}>?\\s*\\)`).test(text)) {
      warnings.push(`AGENTS.md: no link to ${name}`);
    }
  }
  return { exists: true, section };
}

const texts = Object.fromEntries(RECORDS.map((name) => [name, read(name)]));
const agentsText = read('AGENTS.md');
for (const name of RECORDS) if (texts[name] === null) errors.push(`${name}: missing at the repository root`);
for (const [name, text] of Object.entries({ ...texts, 'AGENTS.md': agentsText })) {
  if (text === null) continue;
  checkLinks(name, text);
  checkPlaceholders(name, text);
}
reportUntrackedLinks();

const open = texts['not-close.md'] !== null ? parseNotClose(texts['not-close.md']) : null;
const oldFiles = fs
  .readdirSync(root)
  .filter((name) => OLD_OPEN_WORK.has(name.toLowerCase()) && fs.statSync(path.join(root, name)).isFile());
const retiring = oldFiles.filter((name) => open?.otherText.some((line) => /\bRetire\b/i.test(line) && line.includes(name)));
for (const name of oldFiles) {
  if (!retiring.includes(name)) {
    warnings.push(`${name}: another open-work file beside not-close.md; import it and retire it (the owner's call)`);
  }
}
const log = texts['action-log.md'] !== null ? parseActionLog(texts['action-log.md']) : null;
const agents = checkAgents(agentsText);
const stateText = texts['state.md'];
const stateDate = stateText?.match(/Last updated (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const stateCommit = stateText?.match(/Last updated \d{4}-\d{2}-\d{2} at commit `?([0-9a-f]{7,40})`?/)?.[1] ?? null;
if (stateText !== null && !stateDate) warnings.push('state.md: no "Last updated YYYY-MM-DD"');
if (stateText !== null && stateDate && !stateCommit) warnings.push('state.md: "Last updated" does not name the commit it was written at');
if (stateCommit && inGit && !resolveHash(stateCommit)) warnings.push(`state.md: commit ${stateCommit} is not in this repository`);

const closedLooking = [];
if (open && log) {
  for (const item of open.items) {
    if (item.checked || item.awaiting) continue;
    const mine = words(item.title);
    let best = null;
    for (const entry of log.titles) {
      const shared = [...mine].filter((word) => entry.words.has(word)).length;
      const score = shared / Math.max(1, Math.min(mine.size, entry.words.size));
      if (mine.size >= 2 && shared >= Math.min(3, mine.size) && score >= 0.6 && (!best || score > best.score)) {
        best = { ...entry, score };
      }
    }
    if (best) closedLooking.push({ item, entry: best });
  }
  if (closedLooking.length) {
    warnings.push(`not-close.md: ${closedLooking.length} open item(s) match a log entry's title; run "summary" for the list`);
  }
}

if (command === 'check') {
  for (const line of errors) console.log(`error   ${line}`);
  for (const line of warnings) console.log(`warning ${line}`);
  console.log(`${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}

const out = [`Project records: ${root}`];
const recordState = (name) => {
  if (!inGit) return '';
  const row = git('status', '--porcelain', '--', name);
  return row ? (row.startsWith('??') ? ' (untracked)' : ' (modified)') : '';
};
out.push(
  `Files: ${RECORDS.map((name) => `${name} ${texts[name] === null ? 'missing' : `ok${recordState(name)}`}`).join(', ')}, ` +
    `AGENTS.md ${agents.exists ? `${agents.section ? 'ok' : 'without the section'}${recordState('AGENTS.md')}` : 'missing'}`,
);
if (open) {
  const t = open.tasks;
  out.push(
    `Open: tasks ${t.high + t.medium + t.low + t.unprioritized} (high ${t.high}, medium ${t.medium}, low ${t.low}` +
      `${t.unprioritized ? `, unprioritized ${t.unprioritized}` : ''}), bugs ${open.bugs}, open questions ${open.questions}, ` +
      `other open items ${open.other}; closed and awaiting a move ${open.awaiting}`,
  );
}
if (log) {
  out.push(
    `Log: ${log.entries} entries; version expected ${log.expected}; not live ${log.notLive}; live unknown ${log.liveUnknown}; ` +
      `not committed ${log.notCommitted}; not pushed ${log.notPushed}; with an unknown field ${log.withUnknown}`,
  );
}
if (retiring.length) out.push(`Old open-work files awaiting the owner's retire decision: ${retiring.join(', ')}`);
if (closedLooking.length) {
  out.push(`Open items whose title matches a log entry (likely closed): ${closedLooking.length}`);
  for (const { item, entry } of closedLooking) {
    out.push(`  not-close.md:${item.line} "${item.title}" ~ action-log.md:${entry.line} "${entry.title}"`);
  }
}

// A commit that only touches the records, AGENTS.md or an old open-work file at the root is a
// record edit: it needs no log entry and does not make state.md stale.
const rootPrefix = repoPath(root);
const recordPaths = new Set([...RECORDS, 'AGENTS.md'].map((name) => repoPath(path.join(root, name))));
const isRecordFile = (file) =>
  recordPaths.has(file) ||
  (OLD_OPEN_WORK.has(path.posix.basename(file).toLowerCase()) && path.posix.dirname(file) === (rootPrefix || '.'));
const commitsIn = (...range) =>
  (git('log', '--no-merges', ...range, '--date=short', '--name-only', '--format=%x00%h%x09%ad%x09%s') ?? '')
    .split('\0')
    .filter((part) => part.trim())
    .map((chunk) => {
      const [header, ...files] = chunk.split('\n').filter(Boolean);
      return { header, hash: header.split('\t')[0], recordOnly: files.length > 0 && files.every(isRecordFile) };
    });

const head = inGit ? git('rev-parse', '--short', 'HEAD') : null;
if (stateDate) {
  const days = Math.floor((Date.now() - Date.parse(`${stateDate}T00:00:00Z`)) / 86400000);
  let line = `State: last updated ${stateDate} (${days} days ago)`;
  if (stateCommit && head) {
    const later = commitsIn(`${stateCommit}..HEAD`).filter((commit) => !commit.recordOnly).length;
    line += `, written at ${stateCommit}; HEAD is ${head}${later ? `, ${later} commits of work later` : ''}`;
  }
  out.push(line);
}

if (head) {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const upstream = git('rev-parse', '--abbrev-ref', '@{u}');
  const counts = upstream ? git('rev-list', '--left-right', '--count', 'HEAD...@{u}')?.split(/\s+/) : null;
  const changed = new Set([...lines(git('diff', 'HEAD', '--name-only')), ...lines(git('ls-files', '--others', '--exclude-standard'))]);
  out.push(
    `Git: ${branch} at ${head}; ` +
      (!remotes.length
        ? 'no remote'
        : upstream
          ? `upstream ${upstream}, ahead ${counts?.[0] ?? '?'}, behind ${counts?.[1] ?? '?'}`
          : 'no upstream for this branch') +
      `; ${changed.size} paths changed or untracked`,
  );

  const named = log ? [...log.named] : [];
  const unnamed = commitsIn(...(allHistory ? [] : ['-n', '50']))
    .filter((commit) => !commit.recordOnly)
    .filter(({ hash }) => !named.some((mention) => mention.startsWith(hash) || hash.startsWith(mention)))
    .map((commit) => commit.header);
  out.push(`Commits ${allHistory ? 'in the whole history' : 'among the last 50'} (no merges, no record-only edits) that action-log.md does not name: ${unnamed.length || 'none'}`);
  for (const row of unnamed.slice(0, 40)) out.push(`  ${row.replace(/\t/g, '  ')}`);
  if (unnamed.length > 40) out.push(`  ... and ${unnamed.length - 40} more`);
}
out.push(`Check: ${errors.length} errors, ${warnings.length} warnings (run "check" for the list)`);
console.log(out.join('\n'));
