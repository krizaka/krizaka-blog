/* The models the posts name, and where each one lives: its official Hugging Face page, or its official page when it is not
   on Hugging Face. A post links the first mention of a model with <Model id="…">its name</Model>; `npm run lint`
   (scripts/content-rules.mjs, modelProblems) refuses a known model name whose first mention in a post is not linked.
   Every URL was checked to answer 200 on 2026-10-17 (tests/models.test.mjs keeps the shape; scripts/check-links.mjs
   --external fetches them on the built site).
   `patterns` are regular expressions (source strings, case-sensitive) for the names as they are written in prose; the most
   specific model comes first, and a family entry (`family: true`, its organisation page) is satisfied by a link to one of its
   models earlier in the post. No alias: this file is imported by the lint script and the tests as plain TypeScript. */

export type ModelLink = {
  /** The id a post writes: <Model id="wan22-t2v-a14b">Wan 2.2 A14B</Model>. */
  id: string;
  /** The name as the model's publisher writes it. */
  name: string;
  url: string;
  /** The family the entry belongs to (a family entry's own id). */
  group: string;
  /** A family's page (the organisation), linked when a post names the family rather than one model. */
  family?: boolean;
  patterns: readonly string[];
};

const HF = "https://huggingface.co/";

export const MODELS: readonly ModelLink[] = [
  /* Video — Wan 2.2 (Alibaba, Apache-2.0). */
  {
    id: "wan22-t2v-a14b",
    name: "Wan 2.2 T2V A14B",
    url: `${HF}Wan-AI/Wan2.2-T2V-A14B`,
    group: "wan",
    patterns: ["Wan ?2\\.2 T2V(?:-| )A14B", "Wan ?2\\.2 A14B(?! I2V)(?! \\(I2V)"],
  },
  {
    id: "wan22-i2v-a14b",
    name: "Wan 2.2 I2V A14B",
    url: `${HF}Wan-AI/Wan2.2-I2V-A14B`,
    group: "wan",
    patterns: ["Wan ?2\\.2 I2V(?:-| )A14B", "Wan ?2\\.2 A14B I2V"],
  },
  {
    id: "wan22-ti2v-5b",
    name: "Wan 2.2 TI2V 5B",
    url: `${HF}Wan-AI/Wan2.2-TI2V-5B`,
    group: "wan",
    patterns: ["Wan ?2\\.2 TI2V(?:-| )5B", "Wan ?2\\.2 5B"],
  },
  { id: "wan", name: "Wan", url: `${HF}Wan-AI`, group: "wan", family: true, patterns: ["Wan ?2\\.[12]\\b"] },
  { id: "ltx-2", name: "LTX-2", url: `${HF}Lightricks/LTX-2`, group: "ltx", patterns: ["LTX-2\\b"] },
  {
    id: "ltx-video",
    name: "LTX-Video",
    url: `${HF}Lightricks/LTX-Video`,
    group: "ltx",
    family: true,
    patterns: ["LTX-Video", "\\bLTX\\b(?!-)"],
  },
  /* Images. */
  {
    id: "flux2-klein-9b",
    name: "FLUX.2 [klein] 9B",
    url: `${HF}black-forest-labs/FLUX.2-klein-9B`,
    group: "flux",
    patterns: ["FLUX\\.2 \\[?klein\\]? 9B"],
  },
  {
    id: "flux2-klein-4b",
    name: "FLUX.2 [klein] 4B",
    url: `${HF}black-forest-labs/FLUX.2-klein-4B`,
    group: "flux",
    patterns: ["FLUX\\.2 \\[?klein\\]?(?: 4B)?"],
  },
  {
    id: "flux2-dev",
    name: "FLUX.2 [dev]",
    url: `${HF}black-forest-labs/FLUX.2-dev`,
    group: "flux",
    patterns: ["FLUX\\.2 \\[?dev\\]?"],
  },
  {
    id: "flux1-schnell",
    name: "FLUX.1 [schnell]",
    url: `${HF}black-forest-labs/FLUX.1-schnell`,
    group: "flux",
    patterns: ["FLUX\\.1 \\[?schnell\\]?"],
  },
  {
    id: "flux1-dev",
    name: "FLUX.1 [dev]",
    url: `${HF}black-forest-labs/FLUX.1-dev`,
    group: "flux",
    patterns: ["FLUX\\.1(?: \\[?dev\\]?)?"],
  },
  {
    id: "flux",
    name: "FLUX",
    url: `${HF}black-forest-labs`,
    group: "flux",
    family: true,
    patterns: ["\\bFLUX\\b(?!\\.)"],
  },
  {
    id: "sd35-large",
    name: "Stable Diffusion 3.5 Large",
    url: `${HF}stabilityai/stable-diffusion-3.5-large`,
    group: "sd",
    patterns: ["Stable Diffusion 3\\.5(?: Large)?", "\\bSD ?3\\.5(?: Large)?"],
  },
  {
    id: "sdxl",
    name: "Stable Diffusion XL",
    url: `${HF}stabilityai/stable-diffusion-xl-base-1.0`,
    group: "sd",
    patterns: ["\\bSDXL\\b", "Stable Diffusion XL"],
  },
  {
    id: "sd15",
    name: "Stable Diffusion 1.5",
    url: `${HF}stable-diffusion-v1-5/stable-diffusion-v1-5`,
    group: "sd",
    patterns: ["Stable Diffusion 1\\.5", "\\bSD ?1\\.5"],
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion",
    url: `${HF}stabilityai`,
    group: "sd",
    family: true,
    patterns: ["Stable Diffusion(?! ?[0-9X])"],
  },
  {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    url: `${HF}Tongyi-MAI/Z-Image-Turbo`,
    group: "z-image",
    patterns: ["Z-Image(?: Turbo)?"],
  },
  {
    id: "hunyuanvideo",
    name: "HunyuanVideo",
    url: `${HF}tencent/HunyuanVideo`,
    group: "hunyuan",
    patterns: ["Hunyuan ?Video"],
  },
  /* Upscalers. */
  {
    id: "seedvr2",
    name: "SeedVR2",
    url: `${HF}ByteDance-Seed/SeedVR2-7B`,
    group: "seedvr2",
    patterns: ["\\bSeedVR2?\\b"],
  },
  {
    id: "real-esrgan",
    name: "Real-ESRGAN",
    url: "https://github.com/xinntao/Real-ESRGAN",
    group: "real-esrgan",
    patterns: ["Real-ESRGAN"],
  },
  /* Audio and music. */
  {
    id: "ace-step",
    name: "ACE-Step",
    url: `${HF}ACE-Step/Ace-Step1.5`,
    group: "ace-step",
    patterns: ["ACE-Step(?: 1\\.5| v1)?"],
  },
  { id: "mmaudio", name: "MMAudio", url: `${HF}hkchengrex/MMAudio`, group: "mmaudio", patterns: ["\\bMMAudio\\b"] },
  {
    id: "stable-audio-open",
    name: "Stable Audio Open 1.0",
    url: `${HF}stabilityai/stable-audio-open-1.0`,
    group: "stable-audio",
    patterns: ["Stable Audio Open"],
  },
  { id: "xtts", name: "XTTS-v2", url: `${HF}coqui/XTTS-v2`, group: "xtts", patterns: ["XTTS(?:-v2)?"] },
  { id: "kokoro", name: "Kokoro", url: `${HF}hexgrad/Kokoro-82M`, group: "kokoro", patterns: ["\\bKokoro\\b"] },
  { id: "piper", name: "Piper voices", url: `${HF}rhasspy/piper-voices`, group: "piper", patterns: ["\\bPiper\\b"] },
  {
    id: "zonos",
    name: "Zonos v0.1",
    url: `${HF}Zyphra/Zonos-v0.1-transformer`,
    group: "zonos",
    patterns: ["\\bZonos\\b"],
  },
  {
    id: "chatterbox",
    name: "Chatterbox",
    url: `${HF}ResembleAI/chatterbox`,
    group: "chatterbox",
    patterns: ["\\bChatterbox\\b"],
  },
  { id: "f5-tts", name: "F5-TTS", url: `${HF}SWivid/F5-TTS`, group: "f5-tts", patterns: ["F5-TTS"] },
  {
    id: "qwen2-audio",
    name: "Qwen2-Audio 7B Instruct",
    url: `${HF}Qwen/Qwen2-Audio-7B-Instruct`,
    group: "qwen-audio",
    patterns: ["Qwen2-Audio"],
  },
  {
    id: "whisper",
    name: "Whisper large-v3",
    url: `${HF}openai/whisper-large-v3`,
    group: "whisper",
    patterns: ["\\bWhisper\\b"],
  },
  /* Language models. */
  {
    id: "qwen25-7b",
    name: "Qwen2.5 7B Instruct",
    url: `${HF}Qwen/Qwen2.5-7B-Instruct`,
    group: "qwen",
    patterns: ["Qwen ?2\\.5 7B(?! ?VL)"],
  },
  {
    id: "qwen25-vl-7b",
    name: "Qwen2.5-VL 7B Instruct",
    url: `${HF}Qwen/Qwen2.5-VL-7B-Instruct`,
    group: "qwen",
    patterns: ["Qwen ?2\\.5[- ]VL(?: 7B)?"],
  },
  {
    id: "qwen3-235b",
    name: "Qwen3 235B-A22B",
    url: `${HF}Qwen/Qwen3-235B-A22B`,
    group: "qwen",
    patterns: ["Qwen ?3[- ]235B(?:-A22B)?"],
  },
  { id: "qwen3-4b", name: "Qwen3 4B", url: `${HF}Qwen/Qwen3-4B`, group: "qwen", patterns: ["Qwen ?3[- ]4B"] },
  { id: "qwen", name: "Qwen", url: `${HF}Qwen`, group: "qwen", family: true, patterns: ["\\bQwen(?: ?[0-9.]+)?\\b"] },
  {
    id: "deepseek-v3",
    name: "DeepSeek-V3",
    url: `${HF}deepseek-ai/DeepSeek-V3`,
    group: "deepseek",
    patterns: ["DeepSeek[- ]V3(?:\\.\\d)?"],
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1",
    url: `${HF}deepseek-ai/DeepSeek-R1`,
    group: "deepseek",
    patterns: ["DeepSeek[- ]R1"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: `${HF}deepseek-ai`,
    group: "deepseek",
    family: true,
    patterns: ["\\bDeepSeek\\b"],
  },
  {
    id: "llama31-8b",
    name: "Llama 3.1 8B Instruct",
    url: `${HF}meta-llama/Llama-3.1-8B-Instruct`,
    group: "llama",
    patterns: ["Llama ?3\\.1 8B"],
  },
  {
    id: "llama31-405b",
    name: "Llama 3.1 405B Instruct",
    url: `${HF}meta-llama/Llama-3.1-405B-Instruct`,
    group: "llama",
    patterns: ["Llama ?3\\.1 405B"],
  },
  {
    id: "llama",
    name: "Llama",
    url: `${HF}meta-llama`,
    group: "llama",
    family: true,
    patterns: ["\\bLlama\\b(?!\\.cpp)"],
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B Instruct",
    url: `${HF}mistralai/Mixtral-8x7B-Instruct-v0.1`,
    group: "mistral",
    patterns: ["Mixtral(?: 8x7B)?"],
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B Instruct",
    url: `${HF}mistralai/Mistral-7B-Instruct-v0.3`,
    group: "mistral",
    patterns: ["Mistral 7B"],
  },
  {
    id: "mistral",
    name: "Mistral",
    url: `${HF}mistralai`,
    group: "mistral",
    family: true,
    patterns: ["\\bMistral\\b(?! AI)"],
  },
  { id: "glm-45", name: "GLM-4.5", url: `${HF}zai-org/GLM-4.5`, group: "glm", patterns: ["\\bGLM[- ]4\\.5\\b"] },
  { id: "glm", name: "GLM", url: `${HF}zai-org`, group: "glm", family: true, patterns: ["\\bGLM\\b"] },
  {
    id: "kimi-k2",
    name: "Kimi K2 Instruct",
    url: `${HF}moonshotai/Kimi-K2-Instruct`,
    group: "kimi",
    patterns: ["Kimi[- ]K2"],
  },
  { id: "kimi", name: "Kimi", url: `${HF}moonshotai`, group: "kimi", family: true, patterns: ["\\bKimi\\b"] },
  {
    id: "gpt-oss-120b",
    name: "gpt-oss-120b",
    url: `${HF}openai/gpt-oss-120b`,
    group: "gpt-oss",
    patterns: ["gpt-oss-120b"],
  },
  {
    id: "gpt-oss-20b",
    name: "gpt-oss-20b",
    url: `${HF}openai/gpt-oss-20b`,
    group: "gpt-oss",
    patterns: ["gpt-oss-20b"],
  },
  { id: "gemma-3", name: "Gemma 3", url: `${HF}google/gemma-3-4b-it`, group: "gemma", patterns: ["\\bGemma ?3\\b"] },
  /* Embeddings and vision-language. */
  {
    id: "nomic-embed-text",
    name: "nomic-embed-text v1.5",
    url: `${HF}nomic-ai/nomic-embed-text-v1.5`,
    group: "nomic",
    patterns: ["nomic-embed-text"],
  },
  { id: "bge-m3", name: "BGE-M3", url: `${HF}BAAI/bge-m3`, group: "bge", patterns: ["\\bBGE-M3\\b", "\\bbge-m3\\b"] },
  {
    id: "llava",
    name: "LLaVA 1.5 7B",
    url: `${HF}liuhaotian/llava-v1.5-7b`,
    group: "llava",
    patterns: ["\\bLLaVA\\b", "\\bllava\\b"],
  },
];

export const MODEL_BY_ID: ReadonlyMap<string, ModelLink> = new Map(MODELS.map((m) => [m.id, m]));

/** The URL of a model id; throws on an unknown id (a typo must fail the build, not ship a dead link). */
export function modelUrl(id: string): string {
  const m = MODEL_BY_ID.get(id);
  if (!m) throw new Error(`lib/models.ts has no model "${id}"`);
  return m.url;
}

export type Mention = { id: string; start: number; end: number; linked?: string };

/** The text of an MDX body with what is not prose blanked out (same length, so offsets hold): the front matter is already
    gone; code fences, inline code, headings, JSX attribute values, link targets and HTML comments are not prose. */
export function proseOf(body: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  return body
    .replace(/(```|~~~)[\s\S]*?\1/g, blank)
    .replace(/`[^`\n]*`/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/^#{1,6} .*$/gm, blank)
    .replace(/(=)("[^"]*"|'[^']*')/g, (_, eq: string, v: string) => eq + blank(v))
    .replace(/\]\([^)]*\)/g, blank);
}

/** Every mention of a known model in a post body, in order, each with the id of the <Model> that wraps it (if any). A
    span claimed by a more specific model is not counted again for a less specific one. */
export function mentionsOf(body: string): Mention[] {
  const prose = proseOf(body);
  const wrappers: { id: string; start: number; end: number }[] = [];
  for (const m of body.matchAll(/<Model\s+id="([^"]*)"\s*>([\s\S]*?)<\/Model>/g)) {
    const open = m[0].indexOf(">") + 1;
    wrappers.push({ id: m[1], start: m.index! + open, end: m.index! + open + m[2].length });
  }
  const taken: [number, number][] = [];
  const out: Mention[] = [];
  for (const model of MODELS) {
    for (const p of model.patterns) {
      for (const m of prose.matchAll(new RegExp(p, "g"))) {
        const start = m.index!;
        const end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        taken.push([start, end]);
        const w = wrappers.find((x) => start >= x.start && end <= x.end);
        out.push({ id: model.id, start, end, ...(w ? { linked: w.id } : {}) });
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** What is wrong with the model links of one post body: a known model whose first mention is not wrapped in its own
    <Model id>, a <Model> with an unknown id, or one whose text is not that model's name. */
export function modelLinkProblems(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/<Model\b([^>]*)>([\s\S]*?)<\/Model>/g)) {
    const id = m[1].match(/\bid="([^"]*)"/)?.[1];
    if (!id || !MODEL_BY_ID.has(id)) out.push(`<Model${m[1]}> names no model of lib/models.ts`);
  }
  const mentions = mentionsOf(body);
  const linkedGroups = new Set<string>();
  const seen = new Set<string>();
  for (const x of mentions) {
    const model = MODEL_BY_ID.get(x.id)!;
    if (x.linked && x.linked !== x.id)
      out.push(`"${body.slice(x.start, x.end)}" is wrapped in <Model id="${x.linked}">, but it names ${x.id}`);
    if (!seen.has(x.id)) {
      seen.add(x.id);
      const ok = x.linked === x.id || (model.family && linkedGroups.has(model.group));
      if (!ok)
        out.push(
          `the first mention of ${model.name} ("${body.slice(x.start, x.end)}", line ${body.slice(0, x.start).split("\n").length}) is not linked: write <Model id="${x.id}">${body.slice(x.start, x.end)}</Model>`,
        );
    }
    if (x.linked === x.id) linkedGroups.add(model.group);
  }
  return out;
}
