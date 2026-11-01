// Shoots the real app for the icon-pack switcher: serves a web export (npx expo export --platform web --output-dir
// /tmp/webdist), seeds an onboarded user, and on each route records every Jewish icon's box, id and colour, hides
// those icons and takes the screenshot, so the page can draw any pack in their place.
// node shoot-packs.cjs <palette: gold|pink|purple|blue|dark|plum> <comma-separated routes>
//   -> /tmp/packs/<route>-<palette>.png and .json
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
const ICONS = new Function(`return ${src.slice(src.indexOf('JewishIconNode[]> = ') + 20).trim().replace(/;\s*$/, '')}`)();
const signature = (n) => (n.t === 'path' ? `path:${n.d}` : n.t === 'g' ? signature(n.c[0]) : `${n.t}:${n.x ?? n.cx}:${n.y ?? n.cy}`);
const SIGS = Object.fromEntries(Object.entries(ICONS).map(([id, nodes]) => [signature(nodes[0]), id]));

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
    const icons = await page.evaluate((sigs) => {
      const sig = (el) => {
        const t = el.tagName.toLowerCase();
        if (t === 'path') return `path:${el.getAttribute('d')}`;
        if (t === 'g') return sig(el.firstElementChild);
        const n = (a) => Number(el.getAttribute(a));
        return t === 'rect' ? `rect:${n('x')}:${n('y')}` : `${t}:${n('cx')}:${n('cy')}`;
      };
      const found = [];
      for (const svg of document.querySelectorAll('svg[viewBox="3.5 3.5 41 41"]')) {
        const group = svg.querySelector('g[stroke]');
        const id = sigs[sig(group.firstElementChild)];
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
        found.push({ id, x: box.left, y: box.top, size: box.width, shown, color: getComputedStyle(group).stroke || group.getAttribute('stroke') });
        svg.style.visibility = 'hidden';
      }
      return found;
    }, SIGS);
    const name = `${route.replace(/\//g, '_')}-${theme}`;
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(icons));
    console.log(name, icons.length, 'icons');
  }
  await browser.close();
  server.close();
})();
