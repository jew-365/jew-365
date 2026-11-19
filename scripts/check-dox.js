#!/usr/bin/env node
// Verifies the DOX contract in the root AGENTS.md mechanically, because the rules it states
// (working links, section order, a Child DOX Index that matches reality) are exactly the kind that
// rot silently as the tree moves.
//
// Checks, per AGENTS.md:
//   1. every relative Markdown link resolves to a file or directory that exists
//   2. the documented section order is respected, and no required section is missing
//   3. the Child DOX Index lists exactly the direct child AGENTS.md files in that subtree
//
// Usage: node scripts/check-dox.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'android', 'ios', '.git', 'dist', '.expo', '.claude']);
const SECTION_ORDER = ['Purpose', 'Ownership', 'Local Contracts', 'Work Guidance', 'Verification', 'Child DOX Index'];
// The root doc is the DOX rail: it carries project-wide instructions instead of the child shape.
const ROOT_REQUIRED = ['Child DOX Index'];

const problems = [];

function findAgentsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      findAgentsFiles(path.join(dir, entry.name), out);
    } else if (entry.name === 'AGENTS.md') {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// Direct children: the nearest AGENTS.md below this one, not the whole subtree.
function directChildren(agentsFile, allAgentsFiles) {
  const dir = path.dirname(agentsFile);
  return allAgentsFiles
    .filter((candidate) => {
      if (candidate === agentsFile) return false;
      const candidateDir = path.dirname(candidate);
      if (!candidateDir.startsWith(dir + path.sep)) return false;
      const between = path.relative(dir, candidateDir).split(path.sep);
      return between.every(
        (_, index) =>
          index === between.length - 1 || !fs.existsSync(path.join(dir, ...between.slice(0, index + 1), 'AGENTS.md')),
      );
    })
    .sort();
}

// Destinations containing parentheses — `(tabs)/AGENTS.md` — must be angle-bracket wrapped in
// Markdown, so both forms have to be parsed.
const LINK = /\[[^\]]*\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*\)/g;

// A link inside a code span or fence is a sample, not a link — the root doc documents the index
// entry format that way.
function stripCode(body) {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function linkTargets(body) {
  return [...stripCode(body).matchAll(LINK)].map((match) => (match[1] ?? match[2] ?? '').trim());
}

function checkLinks(file, body) {
  const dir = path.dirname(file);
  for (const raw of linkTargets(body)) {
    if (!raw || /^(https?:|mailto:|#)/.test(raw)) continue;
    const target = decodeURIComponent(raw.split('#')[0]);
    if (!target) continue;
    if (!fs.existsSync(path.resolve(dir, target))) {
      problems.push(`${path.relative(ROOT, file)}: dead link -> ${target}`);
    }
  }
}

// DOX: "Every reference to a project file or folder must be a relative Markdown link to that path,
// not plain text." Only flags a backticked token that actually resolves to something in the repo,
// so ordinary prose and identifiers cannot trip it.
const PATHISH = /^[\w@./()[\]-]+$/;

function insideRepo(resolved) {
  const relative = path.relative(ROOT, resolved);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function checkPlainTextRefs(file, body) {
  const dir = path.dirname(file);
  const withoutFences = body.replace(/```[\s\S]*?```/g, '');

  for (const match of withoutFences.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].trim().replace(/\/$/, '');
    // A whole shell command contains spaces and never matches, so `pnpm test -- some/file.ts` is
    // left alone. Being linked elsewhere in the doc is NOT an exemption: the rule is per reference.
    if (!PATHISH.test(token) || (!token.includes('.') && !token.includes('/'))) continue;
    if (token.includes('node_modules')) continue; // linking into a dependency is not useful
    const fromDoc = path.resolve(dir, token);
    const fromRoot = path.resolve(ROOT, token);
    const resolved = fs.existsSync(fromDoc) ? fromDoc : fs.existsSync(fromRoot) ? fromRoot : null;
    if (!resolved || !insideRepo(resolved)) continue;
    problems.push(`${path.relative(ROOT, file)}: file reference in plain text, should be a link -> ${token}`);
  }
}

function checkSections(file, body) {
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const isRoot = path.dirname(file) === ROOT;
  const required = isRoot ? ROOT_REQUIRED : SECTION_ORDER;

  for (const section of required) {
    if (!headings.includes(section)) {
      problems.push(`${path.relative(ROOT, file)}: missing section "${section}"`);
    }
  }
  if (isRoot) return;

  const known = headings.filter((h) => SECTION_ORDER.includes(h));
  const ordered = [...known].sort((a, b) => SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b));
  if (known.join('|') !== ordered.join('|')) {
    problems.push(`${path.relative(ROOT, file)}: sections out of order -> ${known.join(', ')}`);
  }
}

function checkChildIndex(file, body, allAgentsFiles) {
  const dir = path.dirname(file);
  const section = body.split('## Child DOX Index')[1];
  if (section === undefined) return;

  const listed = new Set(
    linkTargets(section)
      .filter((target) => target.endsWith('AGENTS.md'))
      .map((target) => path.resolve(dir, decodeURIComponent(target))),
  );
  const actual = directChildren(file, allAgentsFiles);

  for (const child of actual) {
    if (!listed.has(child)) {
      problems.push(`${path.relative(ROOT, file)}: Child DOX Index missing ${path.relative(dir, child)}`);
    }
  }
  for (const entry of listed) {
    if (!actual.includes(entry)) {
      problems.push(`${path.relative(ROOT, file)}: Child DOX Index lists a non-child ${path.relative(dir, entry)}`);
    }
  }
  if (!actual.length && !/No child AGENTS\.md files/.test(section)) {
    problems.push(`${path.relative(ROOT, file)}: leaf doc should state "No child AGENTS.md files."`);
  }
}

const files = findAgentsFiles(ROOT);
for (const file of files) {
  const body = fs.readFileSync(file, 'utf8');
  checkLinks(file, body);
  checkPlainTextRefs(file, body);
  checkSections(file, body);
  checkChildIndex(file, body, files);
}

if (problems.length) {
  console.error(`DOX check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`DOX check passed: ${files.length} AGENTS.md files, links and indexes consistent.`);
