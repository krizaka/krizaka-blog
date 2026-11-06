// WHY  A public post must never carry what is private: registration numbers, the company's mailboxes, the workspace's folders,
//      keys, and (for a post about how the company is run) amounts, supplier names and ledger words. The lists of words were
//      regexes of up to 125 characters; a list of words is data, read by one small matcher.
// WHAT CONFIDENTIAL_ALWAYS (every post) and CONFIDENTIAL_STRICT (a post with `sensitive: true`) as `[matcher, what]` pairs, the
//      matchers (`firstWord`, `firstSecretVariable`) and `confidentialityProblems(file, data, body)`. A matcher is a RegExp or a
//      function `(text) => the first thing found, or null`.
// HOW  Imported by scripts/content-post.mjs and, through scripts/content-rules.mjs, by the tests; nothing to run.
//      Tests: tests/content.test.mjs, tests/confidentiality.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

/** One character of a word (letter, digit, underscore). */
const WORD_CHAR = /\w/;
const isWordChar = (char) => char !== undefined && WORD_CHAR.test(char);

/** The earliest of `words` found as a whole word (or phrase) in the text, in the text's own spelling; case-insensitive. */
export function firstWord(text, words) {
  const lower = text.toLowerCase();
  let best = null;
  for (const word of words) {
    const needle = word.toLowerCase();
    for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, at + 1)) {
      const whole = !isWordChar(lower[at - 1]) && !isWordChar(lower[at + needle.length]);
      if (whole) {
        if (!best || at < best.at) best = { at, found: text.slice(at, at + needle.length) };
        break;
      }
    }
  }
  return best?.found ?? null;
}

/** Suppliers and providers a post about the company's running must not name. */
export const SUPPLIER_NAMES = [
  "RunPod",
  "DigitalOcean",
  "Bunny",
  "Mailgun",
  "Anthropic",
  "Cloudflare",
  "Porkbun",
  "Firebase",
  "BigQuery",
];
/** Ledger, fiscal and bank words (English and French). */
export const LEDGER_WORDS = [
  ...["grand livre", "ledger", "compte 2500", "account 2500", "incorporation", "constitution"],
  ...["facture", "invoice", "comptable", "accountant", "bank", "banque"],
];
/** The last words of a variable name that gives away a provider or an account: `STRIPE_SECRET_KEY`, `X_ADMIN`. */
export const SECRET_SUFFIXES = ["API_KEY", "KEY", "TOKEN", "SECRET", "PASSWORD", "ADMIN"];

/** `STRIPE_SECRET_KEY`: upper-case words joined by single underscores. */
export const VARIABLE_NAME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
/** A run of word characters. */
const WORD_RUN = /\w+/g;

/** The first variable name that ends with a secret suffix (`…_KEY`, `…_TOKEN`), or the bare `API_KEY`; null when none. */
export function firstSecretVariable(text) {
  for (const [run] of text.matchAll(WORD_RUN)) {
    if (!VARIABLE_NAME.test(run)) continue;
    if (run === "API_KEY" || SECRET_SUFFIXES.some((suffix) => run.endsWith(`_${suffix}`))) return run;
  }
  return null;
}

/** Confidentiality: what a public post never carries. `CONFIDENTIAL_ALWAYS` is checked in every post (company registration
    numbers, the company's own e-mail addresses, the private folder's names, secret-looking values); `CONFIDENTIAL_STRICT` in a
    post that declares `sensitive: true` in its front matter (a post about how the company is run): no amount, no tax or ledger
    word, no variable name that gives away a provider or an account, no supplier name. Patterns, not internals. */
export const CONFIDENTIAL_ALWAYS = [
  [/(?<![\d.,])\d{10}(?![\d.,])/, "a 10-digit number (looks like a company registration number)"],
  [/\b\d{4}[ -]\d{3}[ -]\d{3}\b/, "a number grouped like a company registration number"],
  [/[\w.+-]+@krizaka\.com\b/i, "a company e-mail address"],
  [/(^|[^\w-])(env|vault|inbox|prompts)\/[\w.-]/, "a folder name of the private workspace (env/, vault/, inbox/…)"],
  [/Documents\/krizaka|\/Users\/[\w.-]+/, "a path on the founder's machine"],
  [/\bsecrets\.map\b|\.local\.md\b|\bCREDENTIALS\b/, "the name of a private file"],
  [/\b(sk|pk|rk)[-_](live|test|ant|proj)?[-_]?[A-Za-z0-9]{20,}/, "a key-looking value"],
  [/\b(NEQ|TPS|TVQ|GST|QST|SIN|NAS)\b/, "a registration, tax or identity-number word"],
];
export const CONFIDENTIAL_STRICT = [
  [/\$\s?\d|\d[\d\s.,]*\s?(\$|US\$|CAD|USD|EUR|€)(?![\w])/, "an amount of money"],
  [firstSecretVariable, "a key or variable name"],
  [(text) => firstWord(text, SUPPLIER_NAMES), "a supplier name"],
  [(text) => firstWord(text, LEDGER_WORDS), "a ledger, fiscal or bank word"],
];

/** What a matcher finds in the text (its first match), or null. */
const found = (matcher, text) => (typeof matcher === "function" ? matcher(text) : (text.match(matcher)?.[0] ?? null));

/** The confidentiality problems of one post: `text` is the front matter's text and the body together. */
export function confidentialityProblems(file, data, body) {
  const out = [];
  const text = [data.title, data.description, data.seoTitle, data.seoDescription, body]
    .filter((x) => typeof x === "string")
    .join("\n");
  const rules = data.sensitive === true ? [...CONFIDENTIAL_ALWAYS, ...CONFIDENTIAL_STRICT] : CONFIDENTIAL_ALWAYS;
  for (const [matcher, what] of rules) {
    const hit = found(matcher, text);
    if (hit)
      out.push(
        `${file}: confidential — ${what} (“${hit.trim().slice(0, 40)}”); describe the pattern, not the internals`,
      );
  }
  return out;
}
