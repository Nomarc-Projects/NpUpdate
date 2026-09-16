import type { Metadata } from "next";
import { Spotlight404 } from "@/components/not-found/spotlight-404";

export const metadata: Metadata = {
  title: "Page not found — Nomarc Projects",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <Spotlight404 />;
}
