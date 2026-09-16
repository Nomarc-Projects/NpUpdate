"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

/**
 * Minimal drop-in for next-themes covering only what this app uses
 * (attribute="class", light/dark/system, localStorage key "theme").
 *
 * Why not next-themes: it injects its anti-FOUC <script> as a React element,
 * which React 19 flags with a console error every time the tree re-renders on
 * the client (HMR remounts, error-boundary resets). Here the init script lives
 * in the root layout <head>, so React never creates it client-side.
 */

type Theme = "light" | "dark";
type Resolved = Theme | undefined;

const STORAGE_KEY = "theme";
const DEFAULT_THEME = "system";

type ThemeContextValue = {
  theme: string | undefined;
  // Accepts plain strings for parity with the previous provider's signature.
  setTheme: (theme: string) => void;
  resolvedTheme: Resolved;
  systemTheme: Resolved;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: undefined,
  setTheme: () => {},
  resolvedTheme: undefined,
  systemTheme: undefined,
});

function systemPref(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: string) {
  const resolved = theme === "system" ? systemPref() : theme === "dark" ? "dark" : "light";
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  // Accepted for drop-in compatibility; only class-based theming is supported.
  attribute,
  defaultTheme,
  enableSystem,
}: PropsWithChildren<{ attribute?: string; defaultTheme?: string; enableSystem?: boolean }>) {
  const [theme, setThemeState] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [systemTheme, setSystemTheme] = useState<Resolved>(() =>
    typeof window === "undefined" ? undefined : systemPref(),
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (theme) apply(theme);
  }, [theme]);

  // Cross-tab sync, mirroring next-themes behaviour.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setThemeState(e.newValue || DEFAULT_THEME);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: string) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      systemTheme,
      resolvedTheme:
        theme === undefined
          ? undefined
          : theme === "light" || theme === "dark"
            ? theme
            : theme === "system"
              ? systemTheme
              : undefined,
    }),
    [theme, setTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
