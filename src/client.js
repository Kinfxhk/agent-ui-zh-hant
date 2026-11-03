/**
 * agent-ui-zh-hant — DSH client locale pack (zh-Hant / 香港書面語)
 * Host pin: @deepseek-ai/dsh@0.2.1-rc.5
 *
 * Readable ESM source for Node `npm run check`. The Web GUI loads the
 * ModuleLoader build at exports["./client"] (src/client.browser.js), not this file.
 *
 * Official API: ctx.locale.addLanguage + ctx.locale.register(ns, locale, dict)
 * (@deepseek-ai/dsh-client-locale).
 */
import {
  LOCALE_ID,
  LOCALE_LABEL,
  FALLBACK,
  dictionaries,
} from './dictionaries.js';

export const name = 'agent-ui-zh-hant';
/** Cordis inject id for the locale service. */
export const inject = ['locale'];

const LANGUAGE = { id: LOCALE_ID, label: LOCALE_LABEL, fallback: FALLBACK };

/**
 * @param {{ locale: { addLanguage: Function, register: Function }, effect: Function }} ctx
 */
export function apply(ctx) {
  let registered = false;
  try {
    ctx.effect(() => ctx.locale.addLanguage(LANGUAGE), 'agent-ui-zh-hant: language');
    registered = true;
  } catch (error) {
    console.warn(
      'agent-ui-zh-hant: another pack already provides ' + LANGUAGE.id + '; skipping',
      error,
    );
  }
  if (!registered) return;

  for (const [ns, dict] of Object.entries(dictionaries)) {
    ctx.effect(
      () => ctx.locale.register(ns, LOCALE_ID, dict),
      `agent-ui-zh-hant: dict ${ns}`,
    );
  }
}

export { LANGUAGE };
export default { name, inject, apply };
