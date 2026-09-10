import { eq } from "drizzle-orm";
import { FeatureLockedScreen } from "@/components/dashboard/feature-gate-page";
import { HelmChat } from "@/components/helm/helm-chat";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { evaluate } from "@/lib/entitlements";
import { resolveDiscipline } from "@/lib/helm/disciplines";
import { getQuotaState, listConversations } from "@/lib/services/helm";
import { getCurrentUserId } from "@/lib/server-user";
import { getViewer } from "@/lib/viewer-server";

export const dynamic = "force-dynamic";

const GATE_CONFIG = {
  cap: "aiConsultant" as const,
  name: "Nomabot",
  tagline: "Your personal construction industry advisor",
  description:
    "An AI consultant with deep knowledge of the Nigerian construction industry — advise on codes, procurement, contracts, materials, and career strategy. It adapts to your discipline and remembers your projects across sessions.",
  iconName: "sparkles" as const,
  requiredPlan: "plus" as const,
  points: [
    { title: "Adapts to your discipline", desc: "Answers framed for an architect, QS, structural engineer, MEP engineer, builder or surveyor." },
    { title: "Grounded in real sources", desc: "Answers cite the documents they came from, and Nomabot says so plainly when it doesn't know." },
    { title: "Persistent memory", desc: "Remembers your projects, preferences and history across every conversation." },
    { title: "Contract & BOQ review", desc: "Analyse contracts and bills of quantities, flag risk clauses, get plain-English summaries." },
    { title: "Plans your projects", desc: "Proposes tasks and programmes on your project board — nothing changes until you confirm." },
    { title: "Private by design", desc: "Your documents are indexed on Nomarc's own server and never shared with other users." },
  ],
  comingSoonNote:
    "Nomabot runs on Nomarc's own infrastructure — your documents are indexed privately and never pooled with other users. Plus members get access at launch.",
};

/**
 * Nomabot — the gated AI consultant. Locked viewers get the upgrade screen and we
 * never fetch their conversations; granted viewers get the live chat.
 */
export default async function AiConsultantPage() {
  const viewer = await getViewer();
  if (evaluate(viewer, "aiConsultant").state !== "granted") {
    return <FeatureLockedScreen config={GATE_CONFIG} />;
  }

  const userId = await getCurrentUserId();
  let discipline: string | null = null;
  if (userId) {
    try {
      const [row] = await db
        .select({ discipline: profile.discipline, headline: profile.headline })
        .from(profile)
        .where(eq(profile.userId, userId))
        .limit(1);
      discipline = resolveDiscipline({
        profileDiscipline: row?.discipline,
        headline: row?.headline,
      });
    } catch {
      // Pre-migration or profile hiccup — Helm just starts in its general persona.
    }
  }

  const [conversations, quota] = await Promise.all([
    listConversations(),
    getQuotaState(viewer.plan),
  ]);

  return (
    <HelmChat
      initialConversations={conversations}
      defaultDiscipline={discipline}
      quota={{ monthlyMessages: quota.monthlyMessages, used: quota.used, remaining: quota.remaining }}
    />
  );
}
