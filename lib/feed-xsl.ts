/* The stylesheet a browser applies when someone opens /feed.xml (RSS readers ignore it): a readable page instead of raw
   XML — « this is the feed, copy its address into your reader », the latest posts, the way back and to the e-mail form.
   Written at build (app/(en)/feed.xsl/route.ts). Words from the messages of both languages (chosen by the channel's
   <language>), colours from @krizaka/tokens' values for each theme (no CSS variables reach an XSLT page). */
import { values } from "@krizaka/tokens";
import { hslToCss } from "./color.ts";

type Words = { title: string; lead: string; copy: string; latest: string; back: string; email: string; reader: string };

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const palette = (v: typeof values.dark) =>
  `--bg:${hslToCss(v.surface0)};--card:${hslToCss(v.surface1)};--fg:${hslToCss(v.textPrimary)};--muted:${hslToCss(v.textSecondary)};--accent:${hslToCss(v.accentText)};--line:${hslToCss(v.borderDefault)}`;

const css = () =>
  `:root{${palette(values.light)}}@media (prefers-color-scheme:dark){:root{${palette(values.dark)}}}` +
  `*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}` +
  `main{max-width:44rem;margin:0 auto;padding:48px 16px 64px}h1{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.2;margin:0 0 12px}` +
  `p{margin:0 0 12px;color:var(--muted)}a{color:var(--accent);font-weight:600}code{display:block;overflow-wrap:anywhere;padding:12px 14px;margin:8px 0 20px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg);font:14px/1.5 ui-monospace,Menlo,Consolas,monospace}` +
  `h2{font-size:1rem;margin:32px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}ul{list-style:none;padding:0;margin:0}li{padding:14px 0;border-top:1px solid var(--line)}li a{font-size:1.05rem}li p{margin:4px 0 0}` +
  `.row{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:28px}`;

function branch(w: Words) {
  return `<h1>${x(w.title)}</h1><p>${x(w.lead)}</p><p>${x(w.copy)}</p><code><xsl:value-of select="rss/channel/atom:link[@rel='self']/@href"/></code>
<h2>${x(w.latest)}</h2><ul><xsl:for-each select="rss/channel/item[position() &lt;= 10]"><li><a href="{link}"><xsl:value-of select="title"/></a><p><xsl:value-of select="description"/></p></li></xsl:for-each></ul>
<div class="row"><a href="{rss/channel/link}">${x(w.back)}</a><a href="{rss/channel/link}#subscribe">${x(w.email)}</a><a href="https://aboutfeeds.com/">${x(w.reader)}</a></div>`;
}

export function feedXsl(en: Words, fr: Words): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="UTF-8" indent="no"/>
<xsl:template match="/">
<html><xsl:attribute name="lang"><xsl:value-of select="substring(rss/channel/language, 1, 2)"/></xsl:attribute>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><title><xsl:value-of select="rss/channel/title"/> — RSS</title><style>${css()}</style></head>
<body><main><xsl:choose><xsl:when test="starts-with(rss/channel/language, 'fr')">${branch(fr)}</xsl:when><xsl:otherwise>${branch(en)}</xsl:otherwise></xsl:choose></main></body></html>
</xsl:template>
</xsl:stylesheet>
`;
}
