"use client";

/* The loop of a card whose cover is a clip. The card paints the poster first (CoverImage, the LCP stays a picture); the clip
   is fetched and played only when it is wanted: while the pointer is on the card (a device that hovers), or while the card is
   well inside the window on a device that does not (a phone), once the page has loaded. It is muted, decorative (the card's
   title says what it is), paused as soon as the pointer leaves or the card scrolls away, and never fetched under
   `prefers-reduced-motion: reduce` or with Save-Data. */
import { useEffect, useRef, useState } from "react";

export function CardLoop({ mp4, webm }: { mp4: string; webm: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [wanted, setWanted] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const video = ref.current;
    const card = video?.closest(".bl-card");
    if (!video || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const play = () => {
      setWanted(true);
      void video.play().catch(() => undefined);
    };
    const pause = () => video.pause();
    if (window.matchMedia("(hover: hover)").matches) {
      card.addEventListener("pointerenter", play);
      card.addEventListener("pointerleave", pause);
      card.addEventListener("focusin", play);
      card.addEventListener("focusout", pause);
      return () => {
        card.removeEventListener("pointerenter", play);
        card.removeEventListener("pointerleave", pause);
        card.removeEventListener("focusin", play);
        card.removeEventListener("focusout", pause);
      };
    }
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => (e.intersectionRatio >= 0.6 ? play() : pause()), { threshold: [0, 0.6] });
    const start = () => io.observe(card);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      io.disconnect();
    };
  }, []);

  /* The sources arrive with the first wish to play; the browser then loads and starts the clip. */
  useEffect(() => {
    const video = ref.current;
    if (!wanted || !video) return;
    video.load();
    void video.play().catch(() => undefined);
  }, [wanted]);

  return (
    <video
      ref={ref}
      className="bl-card-loop"
      data-on={on || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setOn(true)}
      onPause={() => setOn(false)}
    >
      {wanted && <source src={webm} type="video/webm" />}
      {wanted && <source src={mp4} type="video/mp4" />}
    </video>
  );
}
