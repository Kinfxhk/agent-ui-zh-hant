#!/usr/bin/env node
/** Rebuild src/dictionaries.js from dicts/zh-Hant/*.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'dicts/zh-Hant/manifest.json'), 'utf8'));
const lines = [];
lines.push('/** Auto-generated from dicts/zh-Hant — do not edit by hand; re-run scripts/embed.mjs */');
lines.push(`export const LOCALE_ID = ${JSON.stringify(manifest.locale)};`);
lines.push(`export const LOCALE_LABEL = '繁體中文（香港）';`);
lines.push(`export const FALLBACK = 'zh';`);
lines.push('/** @type {Record<string, Record<string, string>>} */');
lines.push('export const dictionaries = {');
for (const [ns, meta] of Object.entries(manifest.namespaces)) {
  const dict = JSON.parse(readFileSync(join(root, 'dicts/zh-Hant', meta.file), 'utf8'));
  const body = JSON.stringify(dict, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `  ${l}`))
    .join('\n');
  lines.push(`  ${JSON.stringify(ns)}: ${body},`);
}
lines.push('};');
lines.push('');
writeFileSync(join(root, 'src/dictionaries.js'), lines.join('\n'));
console.log(`[embed] wrote src/dictionaries.js (${Object.keys(manifest.namespaces).length} ns)`);
