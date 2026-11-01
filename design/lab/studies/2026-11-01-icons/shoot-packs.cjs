// Shoots the real app for the icon switchers: serves a web export (npx expo export --platform web --output-dir
// /tmp/webdist), seeds an onboarded user, and on each route records every Jewish icon's box, id and colour, hides
// those icons and takes the screenshot, so a page can draw any drawing in their place. It reads the icons the app
// draws today (pack ב, src/components/jewishIcons.generated.ts): a 2 2 44 44 view box, identified by the first shape.
// node shoot-packs.cjs <palette: gold|pink|purple|blue|dark|plum> <comma-separated routes> [comma-separated ids]
//   -> /tmp/packs/<route>-<palette>.png and .json; with ids, only those icons are hidden and recorded.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = '/tmp/webdist';
const outDir = '/tmp/packs';
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
// The first element of each generated drawing identifies the icon in the DOM.
const src = fs.readFileSync(path.join(__dirname, '../../../../src/components/jewishIcons.generated.ts'), 'utf8');
const literal = (marker) => {
  const start = src.indexOf(marker) + marker.length;
  return new Function(`return ${src.slice(start, src.indexOf('};', start) + 1)}`)();
};
const ICONS = literal('JewishIconNode[]> = ');
const TONES = literal('{ share: number; with: string }> = ');
const shapes = (nodes) => nodes.filter((n) => n.t !== 'defs');
const signature = (n) => (n.t === 'path' ? `path:${n.d}` : n.t === 'g' ? signature(n.c[0]) : `${n.t}:${n.x ?? n.cx}:${n.y ?? n.cy}`);
const SIGS = Object.fromEntries(Object.entries(ICONS).map(([id, nodes]) => [signature(shapes(nodes)[0]), id]));
// The first element filled with a role, in document order outside the defs, tells the icon colour back: the page
// tries each palette colour against it.
const flatten = (nodes) => shapes(nodes).flatMap((n) => [n, ...(n.c ? flatten(n.c) : [])]);
const PROBE = Object.fromEntries(
  Object.entries(ICONS).map(([id, nodes]) => {
    const list = flatten(nodes);
    const index = list.findIndex((n) => n.fill && n.fill.role);
    return [id, { index, tone: TONES[list[index].fill.role] }];
  }),
);
const colors = fs.readFileSync(path.join(__dirname, '../../../../src/theme/colors.ts'), 'utf8');
const CONSTANTS = { gold: 'T_LIGHT', pink: 'T_PINK', purple: 'T_PURPLE', blue: 'T_BLUE', dark: 'T_DARK', plum: 'T_PLUM' };
const paletteColours = (palette) => {
  const block = colors.slice(colors.indexOf(`export const ${CONSTANTS[palette]}:`));
  return ['gold', 'textMuted', 'text', 'goldText', 'onGold', 'textSub'].map((key) => block.match(new RegExp(`\\n  ${key}: '([^']+)'`))[1]);
};

const server = http
  .createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(root, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(`${f}.html`) ? `${f}.html` : path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  })
  .listen(8099);

(async () => {
  const theme = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8099/');
  await page.evaluate((palette) => {
    localStorage.setItem('jew-365\\user-store', JSON.stringify({ state: { isOnboarded: true, gender: 'male', maritalStatus: 'married', theme: palette }, version: 1 }));
  }, theme);
  for (const route of process.argv[3].split(',')) {
    await page.goto(`http://localhost:8099${route}`);
    await page.waitForTimeout(3500);
    const icons = await page.evaluate(({ sigs, probe, candidates, only }) => {
      const hex = (v) => { const h = v.replace('#', ''); const f = h.length === 3 ? [...h].map((d) => d + d).join('') : h.slice(0, 6); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
      const tone = (colour, t) => { const o = hex(t.with); return hex(colour).map((c, i) => Math.round(c * t.share + o[i] * (1 - t.share))); };
      const rgb = (v) => (v.match(/\d+/g) || []).slice(0, 3).map(Number);
      const sig = (el) => {
        const t = el.tagName.toLowerCase();
        if (t === 'path') return `path:${el.getAttribute('d')}`;
        if (t === 'g') return sig(el.firstElementChild);
        const n = (a) => Number(el.getAttribute(a));
        return t === 'rect' ? `rect:${n('x')}:${n('y')}` : `${t}:${n('cx')}:${n('cy')}`;
      };
      const found = [];
      for (const svg of document.querySelectorAll('svg[viewBox="2 2 44 44"]')) {
        const list = [...svg.children].filter((el) => el.tagName.toLowerCase() !== 'defs');
        const id = sigs[sig(list[0])];
        if (only.length && !only.includes(id)) continue;
        const box = svg.getBoundingClientRect();
        if (!id || box.width === 0 || box.bottom < 0 || box.top > window.innerHeight) continue;
        // Inactive tabs stay mounted under the shown one: keep only an icon on top at its centre or near its top edge.
        const onTop = [0.5, 0.25, 0.1].some((share) => {
          const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height * share);
          return top && (svg.contains(top) || top.contains(svg));
        });
        if (!onTop) continue;
        // How much of it shows above whatever covers its lower part (the tab bar), so the page clips the same.
        let shown = box.height;
        for (let dy = 0; dy < box.height; dy += 1) {
          const top = document.elementFromPoint(box.left + box.width / 2, box.top + dy);
          if (!top || !(svg.contains(top) || top.contains(svg))) { if (dy > box.height * 0.1) { shown = dy; break; } }
        }
        const all = [...svg.querySelectorAll('*')].filter((el) => !el.closest('defs'));
        const seen = rgb(getComputedStyle(all[probe[id].index]).fill);
        const color = candidates.find((c) => tone(c, probe[id].tone).every((v, i) => Math.abs(v - seen[i]) <= 2));
        if (!color) throw new Error(`no palette colour gives ${id} its fill ${seen}`);
        found.push({ id, x: box.left, y: box.top, size: box.width, shown, color });
        svg.style.visibility = 'hidden';
      }
      return found;
    }, { sigs: SIGS, probe: PROBE, candidates: paletteColours(theme), only: (process.argv[4] || '').split(',').filter(Boolean) });
    const name = `${route.replace(/\//g, '_')}-${theme}`;
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(icons));
    console.log(name, icons.length, 'icons');
  }
  await browser.close();
  server.close();
})();
