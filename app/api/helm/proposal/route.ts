import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { applyProposal, type HelmProposalInput } from "@/lib/services/helm-proposals";

export const runtime = "nodejs";

/**
 * Confirm-gated write dispatch. Helm only ever *proposes* a change; this route
 * is the sole place a proposal is turned into a real mutation, after the
 * professional clicks confirm. Every dispatch is recorded in `helm_proposal`
 * (pending → applied|failed) so there's an audit trail of what Helm changed.
 */
export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const viewer = await getViewer();
  if (!can(viewer, "aiConsultant")) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const proposal = body?.proposal as HelmProposalInput | undefined;
  if (!proposal || typeof proposal.tool !== "string" || typeof proposal.action !== "string") {
    return NextResponse.json({ error: "Malformed proposal" }, { status: 400 });
  }

  const result = await applyProposal({
    proposal,
    conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    messageId: typeof body.messageId === "string" ? body.messageId : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not apply" }, { status: 422 });
  }
  return NextResponse.json({ ok: true, result: result.data });
}
