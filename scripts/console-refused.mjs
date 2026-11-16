/** The browser-console messages that scripts/check-console.mjs refuses (krizaka-internal#3975). */
export const REFUSED = [
  /blocked by CORS policy/i,
  /No 'Access-Control-Allow-Origin'/i,
  /preloaded using link preload but not used/i,
];
export const refused = (text) => REFUSED.some((re) => re.test(text));
