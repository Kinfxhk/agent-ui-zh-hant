/**
 * agent-ui-zh-hant — DSH client locale pack (zh-Hant / 香港書面語)
 * Host pin: @deepseek-ai/dsh@0.2.1-rc.5
 *
 * Official API: ctx.locale.addLanguage + ctx.locale.register(ns, locale, dict)
 * (@deepseek-ai/dsh-client-locale). Browser-safe — dictionaries are embedded.
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

/**
 * @param {{ locale: { addLanguage: Function, register: Function }, effect: Function }} ctx
 */
export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.locale.addLanguage({
        id: LOCALE_ID,
        label: LOCALE_LABEL,
        fallback: FALLBACK,
      }),
    'agent-ui-zh-hant: language',
  );

  for (const [ns, dict] of Object.entries(dictionaries)) {
    ctx.effect(
      () => ctx.locale.register(ns, LOCALE_ID, dict),
      `agent-ui-zh-hant: dict ${ns}`,
    );
  }
}

export default { name, inject, apply };
