// Builds every board of this study into out/project: the notification boards (build-notif.mjs, the core of
// core/notif.*, data/notif.json) and the home boards (build-home.mjs, core/home.*, data/home.json). The generated
// boards come from notif-base.html and home-base.html (gen-notif-boards.mjs, gen-home-boards.mjs), which this runs first.
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ['gen-notif-boards.mjs', 'gen-notif4-boards.mjs', 'gen-home-boards.mjs', 'build-notif.mjs', 'build-notif4.mjs', 'build-home.mjs']) {
  execFileSync(process.execPath, [join(here, f)], { stdio: ['ignore', 'ignore', 'inherit'] });
}
console.log('built all boards');
