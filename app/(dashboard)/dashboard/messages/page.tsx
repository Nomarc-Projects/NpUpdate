import { MessagesView } from "@/components/dashboard/messages-view";
import { getMyConversations, getOrCreateDirectConversation } from "@/lib/services/messaging";
import { getProfessionals } from "@/lib/services/directory";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  let activeId: string | undefined;
  if (to) {
    try { activeId = await getOrCreateDirectConversation(to); } catch { /* invalid recipient — ignore */ }
  }
  const [conversations, people] = await Promise.all([
    getMyConversations(),
    getProfessionals().catch(() => []),
  ]);
  return (
    <FeatureGate requires="basicProfile">
      <MessagesView conversations={conversations} initialActiveId={activeId} people={people} />
    </FeatureGate>
  );
}