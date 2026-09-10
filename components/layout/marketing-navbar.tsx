"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StaggeredMenu, type StaggeredMenuItem } from "@/components/ui/staggered-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { ArrowLabel } from "@/components/ui/arrow-label";
import { CartButton } from "@/components/exhibition-hub/cart-button";
import { useAuth } from "@/lib/store/auth";
import { useNavUi } from "@/lib/store/nav-ui";
import { signOut as authSignOut } from "@/lib/auth-client";

const desktopNavLinks = [
  { label: "Home",           href: "/" },
  { label: "Tools",          href: "/tools" },
  { label: "Exhibition Hub", href: "/exhibition-hub" },
  { label: "News Feed",     href: "/newsfeed" },
  { label: "About",          href: "/about" },
  { label: "Contact",        href: "/contact" },
];

// Mobile menu mirrors the desktop nav.
const menuItems: StaggeredMenuItem[] = [
  { label: "Home",           link: "/",               ariaLabel: "Go to home page" },
  { label: "Tools",          link: "/tools",          ariaLabel: "View our tools" },
  { label: "Exhibition Hub", link: "/exhibition-hub", ariaLabel: "Browse the exhibition hub" },
  { label: "News Feed",     link: "/newsfeed",      ariaLabel: "Read the news feed" },
  { label: "About",          link: "/about",          ariaLabel: "About Nomarc" },
  { label: "Contact",        link: "/contact",        ariaLabel: "Get in touch" },
];

export function MarketingNavbar({ exhibitionEnabled = true, toolsEnabled = true }: { exhibitionEnabled?: boolean; toolsEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user, signOut: storeSignOut } = useAuth();
  // Published so layout siblings (the Helm FAB) can step aside while the
  // full-screen panel is up — see lib/store/nav-ui.ts.
  const setMenuOpen = useNavUi((s) => s.setMenuOpen);
  useEffect(() => setMenuOpen(open), [open, setMenuOpen]);

  // Withhold the Exhibition Hub and Tools doorways when the super-admin
  // toggles are off.
  const links = desktopNavLinks
    .filter((l) => exhibitionEnabled || l.href !== "/exhibition-hub")
    .filter((l) => toolsEnabled || l.href !== "/tools");
  const items = menuItems
    .filter((i) => exhibitionEnabled || i.link !== "/exhibition-hub")
    .filter((i) => toolsEnabled || i.link !== "/tools");

  async function handleLogout() {
    setOpen(false);
    await authSignOut();
    storeSignOut();
    router.push("/");
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("#")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-[#111] border-b border-transparent dark:border-white/10">
        <div className="px-6 md:px-10 lg:px-14 h-16 flex items-center justify-between">

          {/* ── LEFT: Logo ── */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex-shrink-0" aria-label="Nomarc home">
              <Logo size="sm" />
            </Link>
          </div>

          {/* ── CENTER: Nav links — desktop only ── */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {links.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "text-sm font-medium transition-colors relative group",
                    active
                      ? "text-[#1e1e1e] dark:text-white"
                      : "text-[#666] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white",
                  ].join(" ")}
                >
                  {label}
                  <span
                    className={[
                      "absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#ffd716] transition-transform origin-left",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    ].join(" ")}
                  />
                </Link>
              );
            })}
          </nav>

          {/* ── RIGHT: Theme + Auth/avatar — desktop only | Hamburger — mobile only ── */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Icon actions grouped tightly, then a hairline before auth CTAs.
                Cart is PARKED here too — no checkout to reach, buyers message the
                seller. Route and component remain, just unlinked. */}
            <div className="flex items-center gap-1">
              <div className="hidden md:flex items-center self-center"><ThemeToggle /></div>
            </div>
            <span className="hidden md:block h-5 w-px bg-[#e5e5e5] dark:bg-white/15" aria-hidden />
            {isSignedIn && user ? (
              <div className="hidden md:block">
                <UserMenu user={user} />
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group hidden md:inline-flex items-center px-6 text-sm font-medium text-[#1e1e1e] dark:text-white hover:text-[#ffd716] dark:hover:text-[#ffd716] transition-colors"
                >
                  <ArrowLabel size={15}>Login</ArrowLabel>
                </Link>
                <Link
                  href="/signup"
                  className="hidden md:inline-flex items-center px-5 py-2 rounded-full bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#f5cc00] transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile: avatar (signed in) — taps open the account menu */}
            {isSignedIn && user && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open account menu"
                className="md:hidden w-9 h-9 rounded-full ring-2 ring-[#ffd716] overflow-hidden flex items-center justify-center bg-[#1e1e1e] text-[#ffd716] text-xs font-semibold"
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="md:hidden w-10 h-10 -mr-1 flex items-center justify-center rounded-full text-[#1e1e1e] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/10 transition-colors"
            >
              <Menu size={24} strokeWidth={2.2} />
            </button>
          </div>

        </div>
      </header>

      <StaggeredMenu
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        accentColor="#ffd716"
        colors={["#ffd716", "#1e1e1e"]}
        user={isSignedIn && user ? { name: user.name, role: user.email, avatar: user.avatar } : null}
        onLogout={handleLogout}
      />
    </>
  );
}
