import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { CodeBlock } from "@krizaka/ui/code-block";
import { Stat } from "@krizaka/ui/stat";
import { NumberTicker } from "@krizaka/ui/number-ticker";
import { Stepper } from "@krizaka/ui/stepper";
import { ComparisonTable } from "@krizaka/ui/comparison-table";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "@krizaka/ui/tabs";
import { getDictionary, type Locale } from "@/lib/i18n";
import { modelUrl } from "@/lib/models";
import { Clip } from "./Clip";
import { Figure } from "./Figure";
import { IssueCurve } from "./IssueCurve";
import { Pipeline } from "./Pipeline";
import { Utilization } from "./Utilization";

/** The text of a fenced block as MDX hands it over: `<pre><code className="language-x">text</code></pre>`. */
function fenced(children: ReactNode): { code: string; language?: string } | undefined {
  if (!isValidElement(children)) return undefined;
  const el = children as ReactElement<{ className?: string; children?: ReactNode }>;
  if (typeof el.props.children !== "string") return undefined;
  const language = el.props.className?.match(/language-([\w-]+)/)?.[1];
  return { code: el.props.children.replace(/\n$/, ""), language };
}

/** The plain text of a node: a step's or a case's words arrive as MDX children. */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

/** The props of the children of a given component, in order (`<Step title>` inside `<Steps>`, `<Case …/>` inside `<Compare>`). */
export function childProps<P>(children: ReactNode): P[] {
  const out: P[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (isValidElement(node)) out.push((node as ReactElement<P>).props);
  };
  walk(children);
  return out;
}

/* What the MDX of a post may use: tables scroll at phone width, code blocks with a copy button, a <Note> callout,
   <Numbers> with <Num value label hint?/> (the key figures of a passage, set apart), and the media of the library —
   <Figure id alt caption?/> (an image, responsive, blur-up), <Model id> (a model's name linked to its official page) and <Clip id alt caption?/> (a light video player). Both
   show how the result was made. <Row> sets figures side by side (stacked on a phone). Nothing else — a post is prose,
   tables, code and its media. Since the page language: <Steps><Step title>…</Step></Steps> (a journey, @krizaka/ui Stepper),
   <Compare label topic before after><Case topic before after [beforeDetail afterDetail]/></Compare> (ComparisonTable, a
   « before / after »), <CodeTabs><Tab label>```fence```</Tab></CodeTabs> (Tabs over CodeBlocks). A whole number in <Num> climbs
   with NumberTicker; blocks arrive with the motion system (`data-reveal`, still under reduced motion). */
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
    Num: ({ value, label, hint }: { value: string; label: string; hint?: string }) => (
      <Stat data-reveal="soft" className="bl-num" label={label} value={/^\d{1,9}$/.test(value) ? <NumberTicker value={Number(value)} locale={locale} /> : value} hint={hint} />
    ),
    Steps: ({ children }: { children: ReactNode }) => (
      <div className="bl-steps" data-reveal="soft">
        <Stepper
          steps={childProps<{ title: string; children?: ReactNode }>(children).map((c) => ({ title: c.title, description: textOf(c.children).trim(), status: "done" as const }))}
          labels={{ done: t.stepDone, current: t.stepCurrent, upcoming: t.stepUpcoming, error: t.stepError }}
        />
      </div>
    ),
    Step: () => null,
    Compare: ({ label, topic, before, after, children }: { label: string; topic: string; before: string; after: string; children: ReactNode }) => (
      <div className="bl-compare">
        <ComparisonTable
          label={label}
          topicLabel={topic}
          columns={[
            { id: "before", label: before },
            { id: "after", label: after },
          ]}
          highlight="after"
          rows={childProps<{ topic: string; before: string; after: string; beforeDetail?: string; afterDetail?: string }>(children).map((c, i) => ({
            id: `case-${i}`,
            topic: c.topic,
            answers: { before: { key: c.before, detail: c.beforeDetail }, after: { key: c.after, detail: c.afterDetail } },
          }))}
        />
      </div>
    ),
    Case: () => null,
    CodeTabs: ({ children }: { children: ReactNode }) => {
      const tabs = Array.isArray(children) ? children : [children];
      const items = tabs.filter(isValidElement).map((el, i) => ({ id: `t${i}`, props: (el as ReactElement<{ label: string; children?: ReactNode }>).props }));
      return (
        <TabsRoot className="bl-codetabs" variant="segmented" defaultValue={items[0]?.id}>
          <TabsList aria-label={t.code}>
            {items.map((it) => (
              <TabsTrigger key={it.id} value={it.id}>
                {it.props.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {items.map((it) => (
            <TabsContent key={it.id} value={it.id}>
              {it.props.children}
            </TabsContent>
          ))}
        </TabsRoot>
      );
    },
    Tab: ({ children }: { children: ReactNode }) => <>{children}</>,
    table: (props: ComponentProps<"table">) => (
      <div className="bl-table" tabIndex={0} role="region" aria-label="table">
        <table {...props} />
      </div>
    ),
    Note: ({ children }: { children: React.ReactNode }) => <aside className="bl-note">{children}</aside>,
    Figure: (props: { id: string; alt: string; caption?: React.ReactNode }) => <Figure {...props} locale={locale} />,
    Clip: (props: { id: string; alt: string; caption?: React.ReactNode }) => <Clip {...props} locale={locale} />,
    Utilization: (props: { hourly?: number | string; seconds?: number | string; hosted?: number | string }) => <Utilization {...props} locale={locale} />,
    /* The issue curve of chapter 10 (lib/issue-curve.json), with its text version: a table of the days named in `dates`. */
    IssueCurve: (props: { dates?: string }) => <IssueCurve {...props} locale={locale} />,
    /* A pipeline drawn from the tokens (chapter 11), with its text version: <Pipeline label><Stage title note? tone?>…</Stage></Pipeline>. */
    Pipeline: ({ label, children }: { label: string; children: ReactNode }) => (
      <Pipeline
        label={label}
        locale={locale}
        stages={childProps<{ title: string; note?: string; tone?: string; children?: ReactNode }>(children).map((c) => ({ title: c.title, note: c.note, tone: c.tone, text: textOf(c.children).trim() }))}
      />
    ),
    Stage: () => null,
    Row: ({ children }: { children: React.ReactNode }) => <div className="bl-row">{children}</div>,
    /* A model named in a post, linked to its official page (lib/models.ts) — the first mention; the lint checks it. */
    Model: ({ id, children }: { id: string; children: ReactNode }) => (
      <a className="bl-model" href={modelUrl(id)} rel="external noopener">
        {children}
      </a>
    ),
  };
}
