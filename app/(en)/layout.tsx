import type { ReactNode } from "react";
import SiteRoot from "@/app/components/SiteRoot";

export default function Layout({ children }: { children: ReactNode }) {
  return <SiteRoot locale="en">{children}</SiteRoot>;
}
