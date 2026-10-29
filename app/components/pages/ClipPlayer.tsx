"use client";
import { blurUrl } from "@/lib/blur";
import { useEffect, useRef, useState } from "react";

/* A light player: a native <video> — muted, looping, with its controls — that plays while it is on screen and pauses when
   it leaves. Under `prefers-reduced-motion` it never starts by itself: the poster stays until the reader presses play.
   Nothing loads before the clip comes near the screen: the blur placeholder first, the poster when the clip is within a
   screen of the window, the video only when it plays (preload="none") — so a clip further down never competes with the
   first picture of the page. No library. */
export function ClipPlayer({
  poster,
  mp4,
  webm,
  width,
  height,
  blur,
  label,
}: {
  poster: string;
  mp4: string;
  webm: string;
  width: number;
  height: number;
  blur: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
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
    const soon = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    soon.observe(v);
    return () => {
      io.disconnect();
      soon.disconnect();
    };
  }, []);
  return (
    <video
      ref={ref}
      className="bl-img bl-video"
      width={width}
      height={height}
      poster={near ? poster : undefined}
      muted
      loop
      playsInline
      controls
      preload="none"
      aria-label={label}
      style={{ backgroundImage: blurUrl(blur) }}
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
