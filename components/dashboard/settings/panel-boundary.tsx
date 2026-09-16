"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Isolates one settings section.
 *
 * A throw inside any panel used to reach the route's error boundary and replace
 * the whole page with "Something went wrong" — losing the section list, the
 * header and every other panel along with it, and telling the reader nothing
 * about which part actually failed. /dashboard/settings/account?tab=info did
 * exactly this in production.
 *
 * A class component because `componentDidCatch` has no hook equivalent; this is
 * the one place in the app that needs one.
 *
 * The error is logged rather than swallowed, so the next occurrence names its own
 * cause in the browser console and in Vercel's logs instead of having to be
 * reproduced first.
 */
export class PanelBoundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error(`[settings] "${this.props.label}" panel failed to render:`, error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-xl border border-[#f0d8d8] bg-[#fdf6f6] p-5 dark:border-[#e5484d]/20 dark:bg-[#e5484d]/[0.06]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#fdecec] text-[#c0392b] dark:bg-[#e5484d]/15 dark:text-[#f87171]">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#1e1e1e] dark:text-white">
              {this.props.label} couldn&rsquo;t load
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
              The rest of your settings still work. Try again, and if it keeps happening let us know which
              section it was.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#e3e3e3] px-3.5 py-2 text-[12.5px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white"
            >
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
