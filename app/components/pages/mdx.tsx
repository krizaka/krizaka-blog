import type { ComponentProps } from "react";

/* What the MDX of a post may use: external links open as links (no new tab surprise), tables scroll at phone width, and a
   <Note> callout. Nothing else — a post is prose, tables and code. */
export const mdxComponents = {
  table: (props: ComponentProps<"table">) => (
    <div className="bl-table" tabIndex={0} role="region" aria-label="table">
      <table {...props} />
    </div>
  ),
  Note: ({ children }: { children: React.ReactNode }) => <aside className="bl-note">{children}</aside>,
};
