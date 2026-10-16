import type { ComponentProps } from "react";
import type { Locale } from "@/lib/i18n";
import { Clip } from "./Clip";
import { Figure } from "./Figure";
import { Utilization } from "./Utilization";

/* What the MDX of a post may use: tables scroll at phone width, a <Note> callout, and the media of the library —
   <Figure id alt caption?/> (an image, responsive, blur-up) and <Clip id alt caption?/> (a light video player). Both
   show how the result was made. <Row> sets figures side by side (stacked on a phone). Nothing else — a post is prose,
   tables, code and its media. */
export function mdxComponentsFor(locale: Locale) {
  return {
    table: (props: ComponentProps<"table">) => (
      <div className="bl-table" tabIndex={0} role="region" aria-label="table">
        <table {...props} />
      </div>
    ),
    Note: ({ children }: { children: React.ReactNode }) => <aside className="bl-note">{children}</aside>,
    Figure: (props: { id: string; alt: string; caption?: React.ReactNode }) => <Figure {...props} locale={locale} />,
    Clip: (props: { id: string; alt: string; caption?: React.ReactNode }) => <Clip {...props} locale={locale} />,
    Utilization: (props: { hourly?: number | string; seconds?: number | string; hosted?: number | string }) => <Utilization {...props} locale={locale} />,
    Row: ({ children }: { children: React.ReactNode }) => <div className="bl-row">{children}</div>,
  };
}
