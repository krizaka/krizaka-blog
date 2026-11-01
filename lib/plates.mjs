/* The plates of the covers: the Krizaka mark and the flock, rendered from @krizaka/ui (the official components, static markup) and
   redrawn as line art (lib/line-art.mjs). A build step, not an asset: nothing is copied into the repository. */
import { FLOCK, lineArt } from "./line-art.mjs";

/** `{ mark, birds }`: SVG strings in `ink` on `paper`. */
export async function renderPlates({ ink, paper }) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { Mascot } = await import("@krizaka/ui/mascots");
  const { ProductLogo } = await import("@krizaka/ui");
  const mark = lineArt(
    renderToStaticMarkup(createElement(ProductLogo, { id: "krizaka", size: 400, animated: false })),
    {
      ink,
      paper,
    },
  );
  const birds = FLOCK.map((bird) => ({
    bird,
    svg: lineArt(
      renderToStaticMarkup(createElement(Mascot, { bird, mood: "welcome", tone: "own", animated: false, size: 120 })),
      {
        ink,
        paper,
      },
    ),
  }));
  return { mark, birds };
}
