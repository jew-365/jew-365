// Screenshots of the real app with the picked icons and Rubik: serves a web export (npx expo export --platform web
// --output-dir /tmp/webdist), seeds an onboarded user, and shoots each route at 390 x 844 into /tmp/shots.
// node shoot-app.cjs <light|dark> <comma-separated routes>; then node build-screens.mjs.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const root = '/tmp/webdist';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(f + '.html') ? f + '.html' : path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(8099);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  await p.goto('http://localhost:8099/');
  await p.evaluate((dark) => {
    localStorage.setItem('jew-365\\user-store', JSON.stringify({ state: { isOnboarded: true, gender: 'male', maritalStatus: 'married', name: 'אברהם', theme: dark ? 'dark' : 'gold' }, version: 1 }));
  }, process.argv[2] === 'dark');
  const routes = (process.argv[3] || '/home,/siddur,/more,/mitzvot,/settings,/mitzvah/tefillin,/history').split(',');
  for (const r of routes) {
    await p.goto('http://localhost:8099' + r); await p.waitForTimeout(3500);
    const name = (r.replace(/\//g, '_') || 'root') + (process.argv[2] === 'dark' ? '-dark' : '');
    await p.screenshot({ path: `/tmp/shots/${name}.png`, fullPage: process.argv[4] === 'full' });
    console.log('shot', name);
  }
  await b.close(); server.close();
})();
