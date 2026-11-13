// Node module hooks that let a study's generator import the app's TypeScript at build time:
// `@/` maps to src/, extensionless imports find .ts/.tsx, and TypeScript's transpileModule strips the types.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../../../../');
const SRC = join(REPO, 'src') + '/';
const ts = createRequire(join(REPO, 'package.json'))('typescript');
const find = (p) => [p, p + '.ts', p + '.tsx', p + '/index.ts'].find((f) => existsSync(f) && !existsSync(f + '/'));

// Native and UI packages never load in Node: an import of one becomes a stub whose every export is an inert proxy.
const STUB = /^(react-native(-[\w-]+)?|@react-native[\w/-]*|expo(-[\w-]+)?|@expo\/[\w/-]+|@sentry\/[\w/-]+|react|zustand(\/.*)?|.*\.(siddur|places|png|jpg|svg|ttf|otf|gz|webp))$/;
const inert = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : inert()), apply: () => inert(), construct: () => inert() });

export async function resolve(spec, ctx, next) {
  if (spec.startsWith('stub:')) return { url: spec, shortCircuit: true };
  let base = null;
  if (spec.startsWith('@/')) base = SRC + spec.slice(2);
  else if (/^\.\.?\//.test(spec) && ctx.parentURL?.startsWith(pathToFileURL(SRC).href)) base = join(dirname(fileURLToPath(ctx.parentURL)), spec);
  const f = base && find(base);
  return f ? next(pathToFileURL(f).href, ctx) : next(spec, ctx);
}

export async function load(url, ctx, next) {
  if (url.startsWith('stub:')) {
    const names = new URL(url).searchParams.get('n').split(',').filter(Boolean);
    return { format: 'module', shortCircuit: true, source: 'const inert = ' + inert.toString() + ';\nconst p = inert();\nexport default p;\n' + names.map((n) => 'export const ' + n + ' = p;').join('\n') };
  }
  if (url.endsWith('.json') && url.startsWith(pathToFileURL(REPO).href) && !url.includes('/node_modules/')) {
    return { format: 'module', shortCircuit: true, source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8') };
  }
  if (url.startsWith(pathToFileURL(SRC).href) && /\.tsx?$/.test(url)) {
    let source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      fileName: fileURLToPath(url),
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    source = source.replace(/import\s+([^;]*?)\s*from\s*(['"])([^'"]+)\2/g, (all, clause, q, spec) => {
      if (!STUB.test(spec)) return all;
      const names = (clause.match(/\{([^}]*)\}/)?.[1] ?? '').split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean);
      return 'import ' + clause + ' from ' + q + 'stub:' + spec + '?n=' + names.join(',') + q;
    }).replace(/^import\s*(['"])([^'"]+)\1;?$/gm, (all, q, spec) => (STUB.test(spec) ? '' : all));
    if (/\brequire\(/.test(source)) source = "import { createRequire as __cr } from 'node:module'; const __req = __cr(import.meta.url); const require = (s) => (/\\.(siddur|places|png|jpg|svg|ttf|otf|gz|webp)$/.test(s) ? { asset: s } : __req(s));\n" + source;
    return { format: 'module', source, shortCircuit: true };
  }
  return next(url, ctx);
}
