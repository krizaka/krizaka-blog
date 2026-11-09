/* Every repository and owned-site address of the blog, in one typed, validated place (krizaka-internal#2961).

   A repository made private or renamed is one line here. A chapter asks by name, in plain Markdown:

     [the PR](repo:krizaka-ui/pull/12)      a repository, and a path inside it
     [the site](site:ui/docs)               a site of the org, and a path on it
     {{site:github}}                        the bare address, for a fenced code block that quotes one

   `@krizaka/org` is the source for the sites it knows (`org.sites`); what it does not know lives in the settings below. These
   settings are the source today: `linksFrom` takes them as an argument, so a real settings source can replace them and
   nothing that calls the functions changes. No framework, no alias: scripts and tests import this file directly. */
import { org } from "@krizaka/org";

export type RepoStatus = "public" | "private";

export type Repo = {
  status: RepoStatus;
  /** Its name on GitHub, when it is not the name chapters use. A rename is this one field. */
  github?: string;
};

export type LinkSettings = {
  /** The GitHub organisation page: a site by name (`site:github`) and the base of every repository address. */
  githubOrg: string;
  repos: Record<string, Repo>;
  /** Repositories that left the org and are no longer listed one by one. */
  retiredRepo: RegExp;
  sites: Record<string, string>;
};

const GITHUB_ORG = "https://github.com/krizaka";

const SETTINGS: LinkSettings = {
  githubOrg: GITHUB_ORG,
  repos: {
    ".github": { status: "public" },
    folioviv: { status: "public" },
    "krizaka-blog": { status: "public" },
    "krizaka-com": { status: "public" },
    "krizaka-java": { status: "public" },
    "krizaka-lab": { status: "public" },
    "krizaka-rust": { status: "public" },
    "krizaka-template": { status: "public" },
    "krizaka-ts": { status: "public" },
    "krizaka-ui": { status: "public" },
    "krizaka-ui-builder": { status: "public" },
    sovkora: { status: "public" },
    verikora: { status: "public" },

    "cla-signatures": { status: "private" },
    kridoc: { status: "private" },
    "krizaka-agents": { status: "private" },
    "krizaka-cla-signatures": { status: "private" },
    "krizaka-coming-soon": { status: "private" },
    "krizaka-infra": { status: "private" },
    "krizaka-internal": { status: "private" },
    "krizaka-restricted": { status: "private" },
  },
  /* The fifteen split Sovkora repositories left the org on 2026-11-08 (krizaka-internal#2960), under their orazaka-* and
     sovkora-* names: every address of theirs is a 404 for a reader. The one public repository is krizaka/sovkora. */
  retiredRepo: /^(orazaka|sovkora)-/,
  sites: {
    ...Object.fromEntries(org.sites.map((s: { id: string; url: string }) => [s.id, s.url])),
    /* What @krizaka/org does not list under its current name. */
    github: GITHUB_ORG,
    folioviv: "https://www.folioviv.com",
    sovkora: "https://www.sovkora.com",
    "sovkora-dev": "https://dev.sovkora.com",
    verikora: "https://www.verikora.com",
  },
};

const REPO_NAME = /^[A-Za-z0-9._-]+$/;

/** What is wrong with the settings: a bad name, status or address. Empty when they are valid. */
export function settingsProblems(settings: LinkSettings = SETTINGS): string[] {
  const problems: string[] = [];
  for (const [name, repo] of Object.entries(settings.repos)) {
    if (!REPO_NAME.test(name)) problems.push(`repo "${name}": not a repository name`);
    if (repo.status !== "public" && repo.status !== "private") problems.push(`repo "${name}": status "${repo.status}"`);
    if (repo.github !== undefined && !REPO_NAME.test(repo.github))
      problems.push(`repo "${name}": github "${repo.github}"`);
  }
  for (const [name, url] of Object.entries(settings.sites))
    if (!URL.canParse(url) || new URL(url).protocol !== "https:" || url.endsWith("/"))
      problems.push(`site "${name}": address "${url}"`);
  return problems;
}

const lastTwoLabels = (hostname: string): string => hostname.split(".").slice(-2).join(".");

/** Where the `[` of a Markdown link starts, given the index of its closing `]`: its words may hold brackets of their own. */
function openingBracket(source: string, closing: number): number {
  let depth = 0;
  for (let i = closing; i >= 0; i--) {
    if (source[i] === "]") depth++;
    if (source[i] === "[" && --depth === 0) return i;
  }
  return -1;
}

const REFERENCE = /\]\((repo|site):([^)\s]+)\)/g;
const BARE_REFERENCE = /\{\{(repo|site):([^}\s]+)\}\}/g;
const ADDRESS = /https?:\/\/[^\s)"'`>\]]+/g;

/** The functions over one set of settings. The blog uses them over `SETTINGS`; a test or a settings service brings its own. */
export function linksFrom(settings: LinkSettings) {
  const invalid = settingsProblems(settings);
  if (invalid.length) throw new Error(`lib/links.ts: ${invalid.join("; ")}`);

  const joined = (base: string, path: string): string => (path ? `${base}/${path.replace(/^\//, "")}` : base);

  /** The address of a repository or of a path in it; `null` when it is private (a reader would get a 404). */
  function repoUrl(name: string, path = ""): string | null {
    const repo = settings.repos[name];
    if (!repo) throw new Error(`lib/links.ts: unknown repository "${name}": add it to the settings`);
    return repo.status === "private" ? null : joined(`${settings.githubOrg}/${repo.github ?? name}`, path);
  }

  /** The address of a repository the code itself depends on: it is a bug if that one is not public. */
  function publicRepoUrl(name: string, path = ""): string {
    const url = repoUrl(name, path);
    if (url === null) throw new Error(`lib/links.ts: repository "${name}" is private and has no public address`);
    return url;
  }

  /** The address of a site of the org, or of a path on it. */
  function siteUrl(name: string, path = ""): string {
    const base = settings.sites[name];
    if (!base) throw new Error(`lib/links.ts: unknown site "${name}": add it to the settings or to @krizaka/org`);
    return joined(base, path);
  }

  /** The names on GitHub of the private repositories: what no address in the content may point at. */
  function privateRepoNames(): string[] {
    return Object.entries(settings.repos)
      .filter(([, repo]) => repo.status === "private")
      .map(([name, repo]) => repo.github ?? name);
  }

  /** Whether a name on GitHub is unreachable for a reader: private here, or one of the retired repositories. */
  function isUnreachableRepo(name: string): boolean {
    return privateRepoNames().includes(name) || settings.retiredRepo.test(name);
  }

  function target(kind: string, ref: string): string | null {
    const [name, ...path] = ref.split("/");
    return kind === "repo" ? repoUrl(name, path.join("/")) : siteUrl(name, path.join("/"));
  }

  /** Each `](repo:…)` or `](site:…)` becomes its address; a link to a private repository keeps its words and loses the link. */
  function withLinksResolved(source: string): string {
    let out = source;
    for (const m of [...source.matchAll(REFERENCE)].reverse()) {
      const end = m.index + m[0].length;
      const url = target(m[1], m[2]);
      if (url !== null) {
        out = `${out.slice(0, m.index)}](${url})${out.slice(end)}`;
        continue;
      }
      const opening = openingBracket(source, m.index);
      if (opening !== -1) out = out.slice(0, opening) + source.slice(opening + 1, m.index) + out.slice(end);
    }
    return out;
  }

  /**
   * The content as a reader gets it, for the page, the feeds and llms-full alike. An unknown name throws, so a typo fails the
   * build instead of shipping a dead link.
   */
  function resolveLinks(source: string): string {
    return withLinksResolved(source).replace(
      BARE_REFERENCE,
      (whole: string, kind: string, ref: string) => target(kind, ref) ?? whole,
    );
  }

  /** The registrable domains of the org's sites: `ui.krizaka.com` and `www.krizaka.com` are both `krizaka.com`. */
  function ownedDomains(): Set<string> {
    return new Set(
      Object.values(settings.sites)
        .filter((url) => url !== settings.githubOrg)
        .map((url) => lastTwoLabels(new URL(url).hostname)),
    );
  }

  function isOwnedAddress(address: string): boolean {
    if (!URL.canParse(address)) return false;
    const url = new URL(address);
    const orgPath = new URL(settings.githubOrg).pathname;
    if (url.hostname === "github.com") return url.pathname === orgPath || url.pathname.startsWith(`${orgPath}/`);
    return ownedDomains().has(lastTwoLabels(url.hostname));
  }

  /** The addresses of the org written out in a text: each one should be a reference by name. */
  function writtenOwnedAddresses(text: string): string[] {
    return (text.match(ADDRESS) ?? []).filter(isOwnedAddress);
  }

  return {
    repoUrl,
    publicRepoUrl,
    siteUrl,
    privateRepoNames,
    isUnreachableRepo,
    resolveLinks,
    writtenOwnedAddresses,
  };
}

export const {
  repoUrl,
  publicRepoUrl,
  siteUrl,
  privateRepoNames,
  isUnreachableRepo,
  resolveLinks,
  writtenOwnedAddresses,
} = linksFrom(SETTINGS);
