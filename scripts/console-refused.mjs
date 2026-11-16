/** The browser-console messages that scripts/check-console.mjs refuses (a red) or only reports (krizaka-internal#3975). */
export const REFUSED = [/blocked by CORS policy/i, /No 'Access-Control-Allow-Origin'/i];
/** An unused preload is a warning, never a failure: the prefetch of a linked page replays its image preloads (follow-up issue). */
export const REPORTED = [/preloaded using link preload but not used/i];
export const refused = (text) => REFUSED.some((re) => re.test(text));
export const reported = (text) => REPORTED.some((re) => re.test(text));
/** Sorts the messages of one page: reds (refused) and warnings (reported, with the URLs they name). */
export function classify(messages) {
  const reds = messages.filter(refused);
  const warnings = messages.filter((m) => !refused(m) && reported(m));
  const urls = [...new Set(warnings.flatMap((m) => m.match(/https?:\/\/[^\s'"]+/g) ?? []))];
  return { reds, warnings, urls };
}
