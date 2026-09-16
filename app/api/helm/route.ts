import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { helmChat, helmConfigured, type HelmChatTurn } from "@/lib/helm/client";
import { getQuotaState, recordUsage } from "@/lib/services/helm";

export const runtime = "nodejs";

/**
 * Helm consultant relay. Server-only boundary between the browser and the VM
 * brain: enforces the `aiConsultant` entitlement (plan-gated) and the signed-in
 * user before forwarding. When the VM env is unset the route returns 503 so the
 * UI shows the gate/coming-soon state instead of erroring.
 */
export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const viewer = await getViewer();
  if (!can(viewer, "aiConsultant")) {
    return NextResponse.json({ error: "Upgrade required to use Nomabot" }, { status: 403 });
  }

  if (!helmConfigured) {
    return NextResponse.json({ error: "Nomabot isn't available yet." }, { status: 503 });
  }

  // Fair use: a spent monthly allowance is a soft stop, not an error state —
  // the UI turns this into an upgrade prompt.
  const quota = await getQuotaState(viewer.plan);
  if (quota.remaining !== null && quota.remaining <= 0) {
    return NextResponse.json(
      { error: "You've used this month's Nomabot allowance.", quota },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const history: HelmChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t: unknown): t is HelmChatTurn =>
          !!t && typeof (t as HelmChatTurn).content === "string" &&
          ((t as HelmChatTurn).role === "user" || (t as HelmChatTurn).role === "assistant"))
        .slice(-12)
    : [];

  const startedAt = Date.now();
  try {
    const result = await helmChat({
      message,
      history,
      userId: uid,
      discipline: typeof body.discipline === "string" ? body.discipline : null,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      documentIds: Array.isArray(body.documentIds) ? body.documentIds.filter((d: unknown) => typeof d === "string") : [],
    });
    // Meter every served exchange — limits get tuned from real data later.
    await recordUsage({ latencyMs: Date.now() - startedAt });
    return NextResponse.json({ ...result, quota: { ...quota, used: quota.used + 1 } });
  } catch (err) {
    console.error("[helm] chat relay failed:", err);
    return NextResponse.json({ error: "Nomabot is temporarily unavailable." }, { status: 502 });
  }
}
