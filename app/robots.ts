import type { MetadataRoute } from "next";
import { getMaintenance } from "@/lib/services/platform-settings-read";

const BASE = "https://www.nomarcprojects.com";

// Maintenance state is read per request, so this can't be baked at build time.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // While the site is behind the maintenance screen, every URL would return the
  // same holding page. Letting crawlers index that means the real pages get
  // replaced in search results by "We'll be back shortly".
  const { enabled } = await getMaintenance().catch(() => ({ enabled: false }));
  if (enabled) {
    return { rules: [{ userAgent: "*", disallow: "/" }], host: BASE };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/profile", "/company", "/settings", "/login", "/signup"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
