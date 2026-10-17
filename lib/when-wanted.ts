/* « Only when it is wanted »: runs `go` once, the first time a form is on screen or takes focus. The newsletter's CAPTCHA uses it, so
   Cloudflare's script and challenge frame are never fetched with the page. */
export type WantedTarget = Pick<Element, "addEventListener" | "removeEventListener">;

/** Calls `go` once, the first time `form` is on screen or receives focus; returns the cleanup. Without IntersectionObserver the focus alone triggers it. */
export function whenWanted(form: WantedTarget, go: () => void): () => void {
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    cleanup();
    go();
  };
  const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && fire());
  io?.observe(form as Element);
  form.addEventListener("focusin", fire);
  function cleanup() {
    io?.disconnect();
    form.removeEventListener("focusin", fire);
  }
  return cleanup;
}
