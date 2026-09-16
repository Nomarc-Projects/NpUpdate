import type { Metadata } from "next";
import { AboutUs } from "./about-us";
import { getAboutTeam } from "@/lib/services/platform-settings-read";
import { ABOUT_TEAM_DEFAULT } from "@/lib/services/platform-settings-shared";

export const metadata: Metadata = {
  title: "About Us — Nomarc Projects",
  description:
    "Nomadic Architects is building Nigeria's leading construction marketplace — connecting verified architects, engineers, quantity surveyors, material suppliers and buyers through a modern digital platform.",
  keywords: [
    "Nigeria construction marketplace", "AEC Nigeria", "architects Nigeria",
    "engineers Nigeria", "quantity surveyors", "construction professionals",
    "material suppliers Nigeria", "Nomadic Architects", "Nomarc Projects",
  ],
  openGraph: {
    title: "About Us — Nomarc Projects",
    description:
      "Learn how Nomadic Architects is building Nigeria's construction marketplace — connecting professionals, exhibitors and buyers through a modern digital platform.",
    url: "https://www.nomarcprojects.com/about",
    siteName: "Nomarc Projects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us — Nomarc Projects",
    description:
      "Nigeria's leading construction marketplace connecting architects, engineers, quantity surveyors, material suppliers and buyers.",
  },
};

export default async function AboutPage() {
  // Super-admin-editable (see app/admin/platform/about-team). Fails open to the
  // designed default, so a settings read that goes wrong can never blank the page.
  const team = await getAboutTeam().catch(() => ABOUT_TEAM_DEFAULT);
  return <AboutUs team={team} />;
}
