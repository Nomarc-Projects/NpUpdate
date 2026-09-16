"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for throws that no segment boundary can catch — anything
 * raised inside a root or route-group *layout* (a segment's own error.tsx wraps
 * its children, not itself) or in the root layout's own render.
 *
 * Without this, those failures fell through to Next's unstyled default page —
 * the bare "This page couldn't load" screen — with no branding and no way back.
 * global-error replaces the whole document, so it ships its own <html>/<body>
 * and cannot rely on the app's providers, fonts, or stylesheet.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#ffffff",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 20px",
              borderRadius: 16,
              background: "#fff7cc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
            aria-hidden="true"
          >
            ⚠
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#1e1e1e" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6, color: "#6b6b6b" }}>
            We hit a snag loading this page. It&rsquo;s usually temporary — try again, or head
            back to your dashboard.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{
                padding: "12px 22px",
                borderRadius: 10,
                border: "none",
                background: "#ffd716",
                color: "#1e1e1e",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: "12px 22px",
                borderRadius: 10,
                border: "1px solid #ececec",
                color: "#1e1e1e",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
