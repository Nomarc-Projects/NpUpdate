import type { Metadata } from "next";

/** Public origin used for absolute Open Graph URLs. Mirrors app/layout.tsx. */
export const SITE_URL = "https://www.nomarcprojects.com";

/**
 * The branded root image (`app/opengraph-image.tsx`). Every shareable page
 * falls back to this when it has no image of its own, so a link dropped in
 * WhatsApp always shows a proper 1200x630 card rather than no preview.
 *
 * Set explicitly (instead of leaving `images` unset to inherit) because the
 * per-page `openGraph`/`twitter` objects replace the root ones wholesale, so
 * inheritance is not guaranteed for a page that defines its own object.
 */
export const OG_FALLBACK_IMAGE = "/opengraph-image";

function clip(text: string, max = 160): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Builds the per-page metadata for a shareable page (product, job, company,
 * news): a distinct title/description/image per link so previews are not all
 * the generic site card, with the branded fallback whenever no image exists.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const desc = clip(description);
  const img = image && image.trim() ? image.trim() : OG_FALLBACK_IMAGE;
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: desc,
      url: `${SITE_URL}${path}`,
      siteName: "Nomarc Projects",
      locale: "en_NG",
      type,
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [img],
    },
  };
}
