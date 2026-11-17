"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendVisit } from "@/lib/visit-beacon";

/* Counts the page the reader is on, once per page, without a cookie (lib/visit-beacon.ts). The referrer is the browser's for the page
   that opened the site; a move inside the site has none. Renders nothing; not in the private preview build. */
export function VisitCount() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const referrer = first.current ? document.referrer : "";
    first.current = false;
    sendVisit(pathname, referrer, window.location.hostname);
  }, [pathname]);
  return null;
}
