import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { forgetDocument, helmConfigured, ingestDocument } from "@/lib/helm/client";
import { deletePrivateObject, getPrivateObject, r2PrivateConfigured } from "@/lib/r2";
import {
  deleteDocument, getOwnedDocument, listDocuments, registerDocument, setDocumentStatus,
} from "@/lib/services/helm";

export const runtime = "nodejs";

/**
 * Helm private documents. The browser has already PUT the bytes to the private
 * R2 bucket via /api/upload/presign (kind "helm"); this route registers the
 * document, then streams it to the VM to be indexed into the owner's namespace.
 * The document is registered regardless of VM availability, so nothing is lost
 * if Helm is briefly offline — it can be re-indexed later.
 */
export async function GET() {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ documents: await listDocuments() });
}

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
  const key = typeof body.key === "string" ? body.key : "";
  const name = typeof body.name === "string" ? body.name : "document";
  // The presign route namespaces keys by user id — enforce it here too so a
  // caller can't register an object that isn't theirs.
  if (!key.startsWith(`helm/${uid}/`)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const registered = await registerDocument({
    name,
    storageKey: key,
    mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
    projectId,
  });
  if (!registered) {
    return NextResponse.json({ error: "Could not register document" }, { status: 500 });
  }

  // Best-effort index. Any failure leaves the row "pending" for a later retry.
  if (helmConfigured && r2PrivateConfigured) {
    try {
      const bytes = await getPrivateObject(key);
      const result = await ingestDocument({
        documentId: registered.id,
        userId: uid,
        filename: name,
        mime: typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream",
        contentB64: bytes.toString("base64"),
        projectId,
      });
      if (!result.queued) {
        await setDocumentStatus(registered.id, "failed", { error: result.reason });
      }
    } catch (err) {
      console.error("[helm] document ingest failed:", err);
      await setDocumentStatus(registered.id, "failed", { error: "Ingest request failed" });
    }
  }

  return NextResponse.json({ id: registered.id });
}

export async function DELETE(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const doc = await getOwnedDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove from the RAG store, the private bucket, then our registry — best
  // effort on the external systems so a failure there still lets the row go.
  if (helmConfigured) {
    const projectId = doc.namespace.startsWith("project:") ? doc.namespace.slice("project:".length) : null;
    await forgetDocument({ documentId: id, userId: uid, projectId }).catch(() => {});
  }
  if (r2PrivateConfigured) {
    await deletePrivateObject(doc.storageKey).catch(() => {});
  }
  await deleteDocument(id);
  return NextResponse.json({ ok: true });
}
