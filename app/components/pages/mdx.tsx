import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { CodeBlock } from "@krizaka/ui/code-block";
import { Stat } from "@krizaka/ui/stat";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Clip } from "./Clip";
import { Figure } from "./Figure";
import { Utilization } from "./Utilization";

/** The text of a fenced block as MDX hands it over: `<pre><code className="language-x">text</code></pre>`. */
function fenced(children: ReactNode): { code: string; language?: string } | undefined {
  if (!isValidElement(children)) return undefined;
  const el = children as ReactElement<{ className?: string; children?: ReactNode }>;
  if (typeof el.props.children !== "string") return undefined;
  const language = el.props.className?.match(/language-([\w-]+)/)?.[1];
  return { code: el.props.children.replace(/\n$/, ""), language };
}

/* What the MDX of a post may use: tables scroll at phone width, code blocks with a copy button, a <Note> callout,
   <Numbers> with <Num value label hint?/> (the key figures of a passage, set apart), and the media of the library —
   <Figure id alt caption?/> (an image, responsive, blur-up) and <Clip id alt caption?/> (a light video player). Both
   show how the result was made. <Row> sets figures side by side (stacked on a phone). Nothing else — a post is prose,
   tables, code and its media. */
export function mdxComponentsFor(locale: Locale) {
  const t = getDictionary(locale).post;
  return {
    pre: ({ children, ...rest }: ComponentProps<"pre">) => {
      const block = fenced(children);
      return block ? <CodeBlock className="bl-code" code={block.code} language={block.language} copyLabel={t.copy} copiedLabel={t.copiedCode} /> : <pre {...rest}>{children}</pre>;
    },
    Numbers: ({ children }: { children: ReactNode }) => (
      <aside className="bl-numbers" aria-label={t.keyNumbers}>
        {children}
      </aside>
    ),
    Num: ({ value, label, hint }: { value: string; label: string; hint?: string }) => <Stat className="bl-num" label={label} value={value} hint={hint} />,
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
