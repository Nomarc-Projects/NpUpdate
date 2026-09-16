"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { List, Mail } from "lucide-react";
import { submitLead } from "@/lib/services/crm";
import { cn } from "@/lib/utils";

type Item = { id: string; text: string; level: number };

/**
 * Auto Table-of-Contents + subscribe card for the news feed article.
 * Reads h2/h3 from the rendered article body, assigns ids, and scroll-spies.
 * Renders nothing TOC-wise if the body has no headings (e.g. gated/short posts).
 */
export function NewsToc({ targetId = "article-body" }: { targetId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const hs = Array.from(root.querySelectorAll("h2, h3")) as HTMLElement[];
    const list: Item[] = hs.map((h, i) => {
      if (!h.id) h.id = `sec-${i}-${(h.textContent || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      h.style.scrollMarginTop = "90px";
      return { id: h.id, text: h.textContent || "", level: h.tagName === "H3" ? 3 : 2 };
    });
    setItems(list);
    if (!list.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive((e.target as HTMLElement).id); }),
      { rootMargin: "-80px 0px -70% 0px" },
    );
    hs.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [targetId]);

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || pending) return;
    // Persists as a CRM lead, the same path the news feed index uses — this card
    // previously only raised a toast, so every signup from an article was lost.
    start(async () => {
      try {
        await submitLead({ name: email.split("@")[0], email, source: "newsletter" });
        toast.success("You're subscribed — watch your inbox!");
        setEmail("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't subscribe. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#9a9a9a] mb-3"><List size={14} /> Table of contents</p>
          <ul className="space-y-1.5 border-l border-[#ececec] dark:border-white/10">
            {items.map((it) => (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth" }); }}
                  className={cn(
                    "block -ml-px border-l-2 pl-3 py-0.5 text-[13px] leading-snug transition-colors",
                    it.level === 3 && "pl-5 text-[12.5px]",
                    active === it.id ? "border-[#ffd716] text-[#1e1e1e] dark:text-white font-medium" : "border-transparent text-[#6b6b6b] dark:text-white/55 hover:text-[#1e1e1e] dark:hover:text-white",
                  )}
                >
                  {it.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Subscribe card */}
      <div className="rounded-2xl bg-[#1e1e1e] dark:bg-[#ffd716] p-5">
        <p className="flex items-center gap-2 text-[14px] font-bold text-white dark:text-[#1e1e1e]"><Mail size={15} /> Subscribe now</p>
        <p className="text-[12px] text-white/55 dark:text-[#1e1e1e]/70 mt-1">Stay up to date with the latest construction insights and platform news.</p>
        <form onSubmit={subscribe} className="mt-3 space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full rounded-lg bg-white dark:bg-[#262626] px-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] focus:outline-none focus:ring-2 focus:ring-[#ffd716] dark:focus:ring-[#1e1e1e]"
          />
          <button type="submit" className="w-full py-2 rounded-lg bg-[#ffd716] dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white text-[13px] font-bold hover:opacity-90 transition-opacity">Subscribe</button>
        </form>
      </div>
    </div>
  );
}
