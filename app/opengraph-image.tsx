import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Nomarc Projects — Digital home for everything construction";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "Digital home for everything construction";
const BRIEF =
  "Nigeria's leading construction marketplace — connecting verified architects, " +
  "engineers, quantity surveyors, material suppliers and buyers.";

// Assets are read and inlined as data URIs so the card renders self-contained —
// no dependency on a runtime-safe network fetch or path resolution from the
// generated route.
async function readDataUri(rel: string) {
  const buf = await readFile(path.join(process.cwd(), rel));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const [wordmark, mark] = await Promise.all([
    readDataUri("public/logos/wordmark-on-dark.png"),
    readDataUri("public/logos/mark-yellow.png"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 80,
          background: "#1e1e1e",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <img src={mark} width={72} height={72} alt="" style={{ objectFit: "contain" }} />
        <img
          src={wordmark}
          width={560}
          height={274}
          alt="Nomarc Projects"
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            width: 96,
            height: 6,
            borderRadius: 999,
            background: "#ffd716",
          }}
        />
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: -0.5,
            textAlign: "center",
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.55,
            maxWidth: 880,
            textAlign: "center",
            color: "#bcbcbc",
          }}
        >
          {BRIEF}
        </div>
      </div>
    ),
    size,
  );
}