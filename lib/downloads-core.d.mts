export const FORMATS: readonly ["epub", "pdf"];
export const SERIES: "story";
export type DownloadFormat = (typeof FORMATS)[number];
export function downloadUrl(key: string, locale: string, format: DownloadFormat, hash: string): string;
