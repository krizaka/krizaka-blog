"use client";
import { useEffect, useRef } from "react";

/* A light player: a native <video> — muted, looping, with its controls — that plays while it is on screen and pauses when
   it leaves. Under `prefers-reduced-motion` it never starts by itself: the poster stays until the reader presses play.
   Nothing but the poster loads before the clip is on screen (preload="none"). No library. */
export function ClipPlayer({ poster, mp4, webm, width, height, blur, label }: { poster: string; mp4: string; webm: string; width: number; height: number; blur: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      ([e]) => {
        if (calm.matches) return;
        if (e.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} className="bl-img bl-video" width={width} height={height} poster={poster} muted loop playsInline controls preload="none" aria-label={label} style={{ backgroundImage: `url(${blur})` }}>
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
