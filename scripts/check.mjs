#!/usr/bin/env node
/**
 * M0 gate: required files, JSON parse, locale pack shape, dsh.bundle, no obvious secrets.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function fail(m) {
  console.error(`[check] FAIL: ${m}`);
  process.exit(1);
}
function ok(m) {
  console.log(`[check] OK: ${m}`);
}

const required = [
  'LICENSE',
  'NOTICE',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'THIRD_PARTY_NOTICES.md',
  '.env.example',
  'package.json',
  'cordis.patch.yml',
  'src/index.js',
  'src/client.js',
  'src/client.browser.js',
  'src/dictionaries.js',
  'dicts/zh-Hant/manifest.json',
  'dicts/zh-Hant/common.json',
  'dicts/zh-Hant/settings.json',
  'dicts/zh-Hant/chat.json',
  'dicts/zh-Hant/sidebar.json',
  'glossaries/zh-HK.md',
  'glossaries/zh-HK.json',
  'docs/gaps.md',
  'scripts/extract.mjs',
  'scripts/embed.mjs',
];
for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`);
}
ok('required files');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'agent-ui-zh-hant') fail(`package.json name is ${pkg.name}`);
if (pkg.license !== 'MIT') fail('license must be MIT');
if (!pkg.dsh?.bundle?.patch) fail('package.json missing dsh.bundle.patch');
if (pkg.dsh.bundle.patch !== './cordis.patch.yml') fail(`unexpected dsh.bundle.patch: ${pkg.dsh.bundle.patch}`);
if (pkg.dsh?.client?.immediately) fail('dsh.client.immediately must not be set');
if (!pkg.exports?.['./client']) fail('exports["./client"] missing');
if (pkg.exports['./client'] !== './src/client.browser.js') {
  fail(`exports["./client"] must be ./src/client.browser.js, got ${pkg.exports['./client']}`);
}
if (pkg.main !== 'src/index.js' && pkg.exports?.['.'] !== './src/index.js') {
  fail('main / exports["."] must point at Host src/index.js');
}
ok('package.json + dsh.bundle');

const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8');
if (!/id:\s*agent-ui-zh-hant/.test(patch)) fail('cordis.patch.yml missing insert id agent-ui-zh-hant');
if (!/name:\s*'agent-ui-zh-hant'/.test(patch) && !/name:\s*"agent-ui-zh-hant"/.test(patch)) {
  fail('cordis.patch.yml missing name agent-ui-zh-hant');
}
ok('cordis.patch.yml');

const host = await import(join(root, 'src/index.js'));
if (!Array.isArray(host.inject) || host.inject.length !== 0) fail('Host inject must be []');
if (typeof host.apply !== 'function') fail('Host apply missing');
ok('Host src/index.js');

const browserSrc = readFileSync(join(root, 'src/client.browser.js'), 'utf8');
if (!browserSrc.includes("window.__ModuleLoader__.load")) fail('client.browser.js missing ModuleLoader.load');
if (!browserSrc.includes("id: 'agent-ui-zh-hant'")) fail('client.browser.js missing ModuleLoader id');
if (!browserSrc.includes("繁體中文（香港）")) fail('client.browser.js missing HK label');
if (!browserSrc.includes("inject = ['locale']") && !browserSrc.includes('inject = ["locale"]')) {
  fail('client.browser.js missing inject [locale]');
}
ok('ModuleLoader client');

const manifest = JSON.parse(readFileSync(join(root, 'dicts/zh-Hant/manifest.json'), 'utf8'));
if (manifest.locale !== 'zh-Hant') fail('manifest.locale must be zh-Hant');
const p0 = ['common', 'settings', 'chat', 'sidebar'];
for (const ns of p0) {
  if (!manifest.namespaces?.[ns]) fail(`manifest missing P0 ns ${ns}`);
  const meta = manifest.namespaces[ns];
  const dict = JSON.parse(readFileSync(join(root, 'dicts/zh-Hant', meta.file), 'utf8'));
  if (Object.keys(dict).length < 1) fail(`${ns} dict empty`);
}
JSON.parse(readFileSync(join(root, 'glossaries/zh-HK.json'), 'utf8'));
ok('JSON parse + P0 namespaces');

const mod = await import(join(root, 'src/dictionaries.js'));
if (mod.LOCALE_ID !== 'zh-Hant') fail('LOCALE_ID');
if (!mod.dictionaries?.common || !mod.dictionaries?.settings) fail('dictionaries missing P0');
ok('dictionaries module');

const client = await import(join(root, 'src/client.js'));
if (client.inject?.[0] !== 'locale') fail('inject must be [locale]');
if (typeof client.apply !== 'function') fail('apply missing');
ok('ESM client plugin exports');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const needle of ['zh-Hant', '繁體中文', 'not affiliated', 'Desktop', '0.2.1-rc.5', 'mermaid', 'dsh.bundle', 'cordis.patch']) {
  if (!readme.toLowerCase().includes(needle.toLowerCase()) && !readme.includes(needle)) {
    if (!readme.includes(needle)) fail(`README missing needle: ${needle}`);
  }
}
if (!readme.includes('not affiliated') && !readme.includes('無隸屬') && !readme.includes('Not affiliated')) {
  fail('README missing not-affiliated disclaimer');
}
ok('README needles');

const notice = readFileSync(join(root, 'NOTICE'), 'utf8');
if (!/not affiliated/i.test(notice) && !notice.includes('無隸屬')) fail('NOTICE missing not-affiliated');
ok('NOTICE');

const suspicious =
  /(?:sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/i;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(md|json|ya?ml|mjs|js|example|toml|txt)$/i.test(name) || name === 'LICENSE' || name === 'NOTICE')
      out.push(p);
  }
  return out;
}
for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  if (suspicious.test(text)) fail(`suspicious secret-like material in ${file}`);
}
ok('no obvious secrets');

const outline = spawnSync(process.execPath, [join(root, 'scripts/extract.mjs'), '--outline'], {
  encoding: 'utf8',
});
if (outline.status !== 0) {
  console.error(outline.stdout, outline.stderr);
  fail('extract --outline failed');
}
ok('extract --outline');

console.log('[check] all green');
