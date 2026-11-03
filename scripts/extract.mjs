#!/usr/bin/env node
/**
 * Extract Simplified Chinese locale dictionaries from an installed
 * @deepseek-ai/dsh@0.2.1-rc.5 tree (client.js register() call sites).
 *
 * Usage:
 *   node scripts/extract.mjs              # write dicts/source/zh/*.json
 *   node scripts/extract.mjs --outline    # print plan only (no write)
 *   DSH_ROOT=/path/to/@deepseek-ai/dsh node scripts/extract.mjs
 *
 * Limitations (M0):
 * - Heuristic parse of bundled client.js (not a full AST).
 * - Some values reference local consts (e.g. PLAN_NEXT_ACTION_ZH) → placeholders.
 * - Does NOT run OpenCC; use a separate polish step + glossaries/zh-HK.json.
 * - Package-level locale/*.json meta titles are NOT UI namespace dicts.
 * - Full UI coverage needs every package that calls locale.register — M0 only P0 ns.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outlineOnly = process.argv.includes('--outline');

const P0_TARGETS = [
  { pkg: 'dsh-client-locale', rel: 'lib/client.js', preferConst: 'zh$1', forceNs: 'common' },
  { pkg: 'dsh-client-ui-settings-general', rel: 'lib/client.js' },
  { pkg: 'dsh-client-ui-chat', rel: 'lib/client.js' },
  { pkg: 'dsh-client-ui-conversation', rel: 'lib/client.js' },
  { pkg: 'dsh-client-ui-sidebar', rel: 'lib/client.js' },
  { pkg: 'dsh-client-locale', rel: 'lib/client.js', note: 'also yields settings.locale' },
];

function resolveDshRoot() {
  if (process.env.DSH_ROOT) return process.env.DSH_ROOT;
  try {
    const require = createRequire(import.meta.url);
    const dshPkg = require.resolve('@deepseek-ai/dsh/package.json');
    return dirname(dshPkg);
  } catch {
    const fallback = '/home/box/.local/lib/node_modules/@deepseek-ai/dsh';
    if (existsSync(fallback)) return fallback;
    return null;
  }
}

function extractObjectAt(src, startBrace) {
  let depth = 0;
  for (let i = startBrace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(startBrace, i + 1);
    }
  }
  return null;
}

function findConstObject(src, name, beforeIndex = src.length) {
  const needle = `const ${name} = {`;
  const idx = src.slice(0, beforeIndex).lastIndexOf(needle);
  if (idx < 0) return null;
  return extractObjectAt(src, idx + needle.length - 1);
}

function tryEval(lit) {
  const cleaned = lit
    .replace(/\b[A-Z][A-Z0-9_]*_ZH\b/g, '"（佔位）"')
    .replace(/\b[A-Z][A-Z0-9_]*_EN\b/g, '"placeholder"');
  return Function(`"use strict"; return (${cleaned});`)();
}

function extractFromSource(src) {
  const results = [];
  const re = /locale\.register\(\s*(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let ns = m[1];
    if (!ns && m[2]) {
      const all = [...src.matchAll(new RegExp(`(?:const|let|var)\\s+${m[2]}\\s*=\\s*["']([^"']+)["']`, 'g'))];
      ns = all.length ? all[all.length - 1][1] : m[2];
    }
    const bodyLit = extractObjectAt(src, m.index + m[0].length - 1);
    if (!bodyLit) continue;
    const zhInline = bodyLit.match(/zh\s*:\s*\{/);
    if (zhInline) {
      const zhLit = extractObjectAt(bodyLit, zhInline.index + zhInline[0].length - 1);
      if (zhLit) {
        try {
          results.push({ ns, dict: tryEval(zhLit) });
        } catch (e) {
          results.push({ ns, error: String(e) });
        }
        continue;
      }
    }
    // zh: zh$1 / zh, en
    const ref = bodyLit.match(/zh\s*:\s*([A-Za-z_$][\w$]*)/) || (/\bzh\s*,/.test(bodyLit) ? ['', 'zh'] : null);
    if (ref) {
      const lit = findConstObject(src, ref[1], m.index);
      if (lit) {
        try {
          results.push({ ns, dict: tryEval(lit) });
        } catch (e) {
          results.push({ ns, error: String(e) });
        }
      } else {
        results.push({ ns, error: `const ${ref[1]} not found` });
      }
    }
  }
  return results;
}

if (outlineOnly) {
  console.log(`# extract outline (M0 P0)
1. Resolve DSH_ROOT (env, require.resolve, or well-known global install).
2. For each P0 package client.js, locate locale.register(NS, { zh, en }).
3. Evaluate zh object literals (heuristic); write dicts/source/zh/<ns>.json.
4. Human/OpenCC + glossaries/zh-HK.json → dicts/zh-Hant/; then npm run embed (scripts/embed.mjs).
5. Gaps: Desktop native menus; inline text maps; third-party copy; const-ref placeholders.

P0 targets:`);
  for (const t of P0_TARGETS) console.log('-', t.pkg, t.rel, t.forceNs || '', t.note || '');
  process.exit(0);
}

const dshRoot = resolveDshRoot();
if (!dshRoot) {
  console.error('[extract] FAIL: cannot find @deepseek-ai/dsh — set DSH_ROOT');
  process.exit(1);
}
const nm = join(dshRoot, 'node_modules', '@deepseek-ai');
console.log('[extract] DSH_ROOT=', dshRoot);

const outDir = join(root, 'dicts/source/zh');
mkdirSync(outDir, { recursive: true });

const collected = {};
const files = [
  join(nm, 'dsh-client-locale/lib/client.js'),
  join(nm, 'dsh-client-ui-settings-general/lib/client.js'),
  join(nm, 'dsh-client-ui-chat/lib/client.js'),
  join(nm, 'dsh-client-ui-conversation/lib/client.js'),
  join(nm, 'dsh-client-ui-sidebar/lib/client.js'),
];

for (const file of files) {
  if (!existsSync(file)) {
    console.warn('[extract] skip missing', file);
    continue;
  }
  const src = readFileSync(file, 'utf8');
  // Force common from zh$1 in locale package
  if (file.includes('dsh-client-locale')) {
    const lit = findConstObject(src, 'zh$1');
    if (lit) {
      try {
        collected.common = tryEval(lit);
        console.log('[extract] common', Object.keys(collected.common).length);
      } catch (e) {
        console.warn('[extract] common eval failed', e);
      }
    }
  }
  for (const r of extractFromSource(src)) {
    if (r.dict && !r.error) {
      collected[r.ns] = r.dict;
      console.log('[extract]', r.ns, Object.keys(r.dict).length);
    } else {
      console.warn('[extract] warn', r.ns, r.error);
    }
  }
}

const want = ['common', 'settings', 'chat', 'sidebar', 'conversation', 'settings.locale'];
for (const ns of want) {
  if (!collected[ns]) {
    console.warn('[extract] missing ns', ns);
    continue;
  }
  const safe = ns.replace(/\./g, '__');
  writeFileSync(join(outDir, `${safe}.json`), JSON.stringify(collected[ns], null, 2) + '\n');
}
writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      locale: 'zh',
      host: '0.2.1-rc.5',
      namespaces: Object.fromEntries(want.filter((n) => collected[n]).map((n) => [n, Object.keys(collected[n]).length])),
    },
    null,
    2,
  ) + '\n',
);
console.log('[extract] wrote', outDir);
