// Module hooks that let plain Node import the app's TypeScript at build time: `@/x` resolves to src/x(.ts|.tsx),
// extensionless relative imports under src/ resolve the same way, every .ts file is transpiled to ESM by the
// repository's own TypeScript, and the modules that would pull in the stores, MMKV or the siddur assets are replaced
// by inert stubs. Only gen-data.mjs registers it; nothing here runs in a board.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const SRC = join(REPO, 'src');
const ts = createRequire(join(REPO, 'package.json'))('typescript');

// Never called for Shacharit, Maariv or the bedtime Shema, whose windows the study reads.
const STUBS = {
  '@/data/chok': 'export const CHOK_TEXT_ID = "chok_leyisrael"; export const hasChokContent = () => false;',
  '@/data/selichot': 'export const hasSelichotContent = () => false;',
  '@/data/siddur':
    'const no = () => { throw new Error("siddur stub"); }; export const MIDNIGHT_TO_MORNING_PRAYER = no; export const siddurPlace = no; export const standaloneAvailability = no; export const hasSiddurText = () => false; export const STANDALONE_TEXTS = {}; export const isSiddurTextId = () => false; export const standaloneTextId = () => null;',
  '@/utils/chok': 'export const chokPortionOn = () => null;',
  // utils/customMitzvah.ts and utils/mitzvahName.ts need it only for functions the study never calls.
  '@/i18n':
    'const no = () => { throw new Error("i18n stub"); }; export const t = no; export const translate = no; export const interpolate = no; export const formatDate = no; export const useI18n = no;',
};

function fileFor(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        if (readFileSync(candidate) !== undefined) return candidate;
      } catch {
        /* a directory */
      }
    }
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: `stub:${specifier}`, shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const file = fileFor(join(SRC, specifier.slice(2)));
    if (!file) throw new Error(`cannot resolve ${specifier}`);
    return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  const parent = context.parentURL && context.parentURL.startsWith('file:') ? fileURLToPath(context.parentURL) : '';
  if (specifier.startsWith('.') && parent.startsWith(SRC) && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
    const file = fileFor(join(parent, '..', specifier));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith('stub:')) return { format: 'module', source: STUBS[url.slice(5)], shortCircuit: true };
  if (/\.tsx?$/.test(url)) {
    const source = readFileSync(fileURLToPath(url), 'utf8');
    const out = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      fileName: fileURLToPath(url),
    });
    return { format: 'module', source: out.outputText, shortCircuit: true };
  }
  if (url.endsWith('.json') && url.startsWith(pathToFileURL(SRC).href)) {
    return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
  }
  return next(url, context);
}
