# Contributing · agent-ui-zh-hant

## Scope

M0 is a **thin locale pack** (zh-Hant + HK glossary + P0 namespaces). Do not whole-tree fork the harness, and do not make `@mimateinn/dsh-i18n` the main line.

## Clean-room

Do not copy competitor UI chrome. Dictionary extraction from an installed DSH host for translation is documented in NOTICE; keep attribution honest.

## Secrets

Never commit API keys or tokens. `.env.example` stays empty.

## AI-assisted development

Review every line. Run `npm run check` before claiming done. Disclose AI tools in public PR text.

## Checks

```bash
npm run check
```

After editing `dicts/zh-Hant/*.json`, run `node scripts/embed.mjs`.

## License

MIT. By contributing you agree your changes are MIT-licensed.
