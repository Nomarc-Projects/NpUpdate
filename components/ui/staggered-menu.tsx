"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { X, LogOut, Sun, Moon, LayoutGrid } from "lucide-react";
import { useTheme } from "@/components/theme";
import { animateThemeChange } from "@/lib/theme-transition";
import "./staggered-menu.css";

export interface StaggeredMenuItem {
  label: string;
  link: string;
  ariaLabel?: string;
}

export interface StaggeredMenuUser {
  name: string;
  role?: string;
  avatar?: string;
}

export type MenuAudience = "professional" | "exhibitor";

interface StaggeredMenuProps {
  open: boolean;
  onClose: () => void;
  items: StaggeredMenuItem[];
  /** colours of the sweep layers shown before the panel */
  colors?: string[];
  accentColor?: string;
  displayItemNumbering?: boolean;
  /** null / undefined → signed-out (Sign in / Sign up) */
  user?: StaggeredMenuUser | null;
  onLogout?: () => void;
  /** Professional/Exhibitor switch, shown in the footer when provided */
  audience?: MenuAudience;
  onAudienceChange?: (a: MenuAudience) => void;
}

function AudienceSwitch({ value, onChange }: { value: MenuAudience; onChange: (a: MenuAudience) => void }) {
  return (
    <div className="flex items-center bg-[#f0f0f0] dark:bg-white/10 rounded-full p-1 gap-1 w-full mb-4">
      {(["professional", "exhibitor"] as MenuAudience[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={[
            "flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
            value === t
              ? "bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-white shadow-sm"
              : "text-[#666] dark:text-white/60",
          ].join(" ")}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  return (
    <div className="sm-theme-row">
      <span className="sm-theme-label">{mounted ? (isDark ? "Dark mode" : "Light mode") : "Theme"}</span>
      <button
        type="button"
        className="sm-theme-toggle"
        aria-label="Toggle theme"
        onClick={(e) => animateThemeChange(isDark ? "light" : "dark", setTheme, { x: e.clientX, y: e.clientY })}
      >
        <span className="sm-theme-knob">
          {mounted && isDark ? <Sun size={13} /> : <Moon size={13} />}
        </span>
      </button>
    </div>
  );
}

export function StaggeredMenu({
  open,
  onClose,
  items,
  colors = ["#ffd716", "#1e1e1e"],
  accentColor = "#ffd716",
  displayItemNumbering = true,
  user = null,
  onLogout,
  audience,
  onAudienceChange,
}: StaggeredMenuProps) {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);

  // initial offscreen placement
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;
      const preLayers = preContainer
        ? Array.from(preContainer.querySelectorAll<HTMLElement>(".sm-prelayer"))
        : [];
      preLayerElsRef.current = preLayers;
      // pin x:0 so gsap doesn't double-count the CSS translateX(100%) as a px matrix
      gsap.set([panel, ...preLayers], { x: 0, xPercent: 100 });
    });
    return () => ctx.revert();
  }, []);

  const animateOpen = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const layers = preLayerElsRef.current;

    closeTweenRef.current?.kill();
    openTlRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>(".sm-panel-itemLabel"));
    const numberEls = Array.from(
      panel.querySelectorAll<HTMLElement>(".sm-panel-list[data-numbering] .sm-panel-item"),
    );
    const footer = panel.querySelector<HTMLElement>(".sm-footer");

    gsap.set(itemEls, { yPercent: 140, rotate: 8 });
    if (numberEls.length) gsap.set(numberEls, { "--sm-num-opacity": 0 } as gsap.TweenVars);
    if (footer) gsap.set(footer, { opacity: 0, y: 24 });

    const tl = gsap.timeline();
    layers.forEach((el, i) => {
      tl.fromTo(el, { x: 0, xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: "power4.out" }, i * 0.08);
    });
    const panelStart = layers.length ? layers.length * 0.08 : 0;
    const panelDuration = 0.62;
    tl.fromTo(panel, { x: 0, xPercent: 100 }, { xPercent: 0, duration: panelDuration, ease: "power4.out" }, panelStart);

    const itemsStart = panelStart + panelDuration * 0.18;
    if (itemEls.length) {
      tl.to(itemEls, { yPercent: 0, rotate: 0, duration: 0.9, ease: "power4.out", stagger: { each: 0.09, from: "start" } }, itemsStart);
    }
    if (numberEls.length) {
      tl.to(numberEls, { "--sm-num-opacity": 1, duration: 0.6, ease: "power2.out", stagger: { each: 0.08, from: "start" } } as gsap.TweenVars, itemsStart + 0.1);
    }
    if (footer) {
      tl.to(footer, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, itemsStart + 0.2);
    }
    openTlRef.current = tl;
  }, []);

  const animateClose = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const layers = preLayerElsRef.current;
    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = gsap.to([panel, ...layers], {
      x: 0,
      xPercent: 100,
      duration: 0.34,
      ease: "power3.in",
      overwrite: "auto",
    });
  }, []);

  // drive animation from `open`
  useEffect(() => {
    if (open) animateOpen();
    else animateClose();
  }, [open, animateOpen, animateClose]);

  // lock scroll while open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <div
      ref={overlayRef}
      className="sm-overlay"
      data-open={open || undefined}
      style={{ ["--sm-accent" as string]: accentColor }}
      aria-hidden={!open}
    >
      <div className="sm-scrim" onClick={onClose} />

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden>
        {colors.slice(0, 3).map((c, i) => (
          <div key={i} className="sm-prelayer" style={{ background: c }} />
        ))}
      </div>

      <aside ref={panelRef} className="sm-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" className="sm-panel-close" aria-label="Close menu" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="sm-panel-inner">
          <ul className="sm-panel-list" data-numbering={displayItemNumbering || undefined}>
            {items.map((it, idx) => {
              const active = it.link !== "#" && (it.link === "/" ? pathname === "/" : pathname.startsWith(it.link));
              return (
                <li className="sm-panel-itemWrap" key={it.label + idx}>
                  <Link
                    href={it.link}
                    aria-label={it.ariaLabel ?? it.label}
                    className={`sm-panel-item${active ? " is-active" : ""}`}
                    onClick={onClose}
                  >
                    <span className="sm-panel-itemLabel">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="sm-footer">
            <div className="sm-footer-divider" />
            {audience && onAudienceChange && (
              <AudienceSwitch value={audience} onChange={onAudienceChange} />
            )}
            {user ? (
              <>
                <div className="sm-profile">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="sm-avatar" style={{ objectFit: "cover", padding: 0 }} />
                  ) : (
                    <span className="sm-avatar">{initials}</span>
                  )}
                  <div>
                    <div className="sm-profile-name">{user.name}</div>
                    {user.role && <div className="sm-profile-sub">{user.role}</div>}
                  </div>
                </div>
                <Link href="/dashboard" className="sm-visit-dashboard" onClick={onClose}>
                  <LayoutGrid size={16} /> Visit Dashboard
                </Link>
                <button type="button" className="sm-logout" onClick={onLogout}>
                  <LogOut size={16} /> Log out
                </button>
              </>
            ) : (
              <div className="sm-auth">
                <Link href="/login" className="sm-btn sm-btn-outline" onClick={onClose}>
                  Sign in
                </Link>
                <Link href="/signup" className="sm-btn sm-btn-solid" onClick={onClose}>
                  Sign up
                </Link>
              </div>
            )}
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default StaggeredMenu;
