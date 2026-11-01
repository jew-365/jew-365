// Renders today's app icons (src/components/MitzvahIcon.tsx) to SVG markup in today.json,
// so the gallery shows the real current drawings beside the new ones. Run from the repo with pnpm installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const require = createRequire(join(repo, 'package.json'));
const { transform } = require(join(repo, 'node_modules/.pnpm/node_modules/sucrase'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const src = readFileSync(join(repo, 'src/components/MitzvahIcon.tsx'), 'utf8')
  .replace(/^import[^;]+;\n/gm, '')
  .replace(/^export /gm, '');
const { code } = transform(src, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: true });
const tag = (t) => (props) => React.createElement(t, props);
const svg = { Circle: tag('circle'), Ellipse: tag('ellipse'), G: tag('g'), Line: tag('line'), Path: tag('path'), Rect: tag('rect') };
const scaled = (n) => n;
const body = `${code}\nreturn { DRAWINGS, ICON_NAMES };`;
const { DRAWINGS, ICON_NAMES } = new Function('React', 'Svg', 'Circle', 'Ellipse', 'G', 'Line', 'Path', 'Rect', 'scaled', body)(
  React, tag('svg'), svg.Circle, svg.Ellipse, svg.G, svg.Line, svg.Path, svg.Rect, scaled,
);
const out = {};
for (const name of ICON_NAMES) {
  out[name] = renderToStaticMarkup(React.createElement(React.Fragment, null, DRAWINGS[name]({ fill: '__FILL__', sw: 1.8 })));
}
writeFileSync(join(here, 'today.json'), JSON.stringify(out, null, 1));
console.log(`today.json: ${Object.keys(out).length} icons`);
