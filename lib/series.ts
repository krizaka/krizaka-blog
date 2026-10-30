/* The story as a series: a chapter is the Nth part of it (schema.org CreativeWorkSeries). The same node on every chapter of a language. */
export const seriesId = (locale: string, url: string) => `${url}#series-${locale}`;

export function seriesNode(locale: string, series: { name: string; url: string }, publisherId: string) {
  return {
    "@type": "CreativeWorkSeries",
    "@id": seriesId(locale, series.url),
    name: series.name,
    url: series.url,
    inLanguage: locale,
    publisher: { "@id": publisherId },
  };
}
