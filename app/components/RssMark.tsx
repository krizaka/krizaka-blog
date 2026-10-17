/* The RSS mark (the web-feed symbol, a common glyph not in @krizaka/icons): next to the feed link. */
export function RssMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="5" cy="19" r="2.2" />
      <path d="M3 10.5a10.5 10.5 0 0 1 10.5 10.5h-3A7.5 7.5 0 0 0 3 13.5z" />
      <path d="M3 4a17 17 0 0 1 17 17h-3A14 14 0 0 0 3 7z" />
    </svg>
  );
}
