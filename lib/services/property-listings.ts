"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { property, propertyDocument, propertyEvent, propertyListerProfile, propertyMedia, propertyTransaction } from "@/lib/db/schema";
import { requireUserId } from "@/lib/server-user";
import { getProperties } from "@/lib/services/platform-settings-read";
import {
  isPropertyCategory,
  isPropertyCurrency,
  isPropertyDocumentType,
  isPropertyKind,
  isPropertyPricePeriod,
  isPropertyType,
  REQUIRED_PROPERTY_DOCUMENTS,
  type PropertyDocumentType,
} from "@/lib/constants/property";
import { computeListingFee, parseMoneyToMinor, toNgnMinor } from "@/lib/properties/pricing";

export type PropertyMediaInput = {
  url: string;
  kind?: string;
  caption?: string;
};

export type PropertyDocumentInput = {
  docType: PropertyDocumentType;
  storageKey: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type PropertyDraftInput = {
  id?: string;
  title: string;
  description?: string;
  kind: string;
  category: string;
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  sizeSqm?: string;
  sizeAcres?: string;
  bedrooms?: string;
  bathrooms?: string;
  price: string;
  currency?: string;
  pricePeriod?: string;
  minimumAcreage?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  media?: PropertyMediaInput[];
  documents?: PropertyDocumentInput[];
  submit?: boolean;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);

const positiveNumber = (v: string | number | undefined | null) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const positiveInt = (v: string | number | undefined | null) => {
  const n = positiveNumber(v);
  return n == null ? null : Math.round(n);
};

export type SavePropertyResult = { id: string; slug: string; status: string };

export async function saveProperty(input: PropertyDraftInput): Promise<SavePropertyResult> {
  const uid = await requireUserId();
  const title = input.title.trim();
  if (!title) throw new Error("Property title is required");
  if (!isPropertyKind(input.kind)) throw new Error("Choose a listing kind");
  if (!isPropertyCategory(input.category)) throw new Error("Choose a property category");
  if (!isPropertyCurrency(input.currency || "NGN")) throw new Error("Unsupported currency");
  if (!isPropertyPricePeriod(input.pricePeriod || "one_off")) throw new Error("Unsupported price period");
  if (input.propertyType && !isPropertyType(input.propertyType)) throw new Error("Unsupported property type");

  const priceMinor = parseMoneyToMinor(input.price);
  if (priceMinor == null || priceMinor <= 0) throw new Error("Enter a valid price");

  const docs = (input.documents ?? []).filter((d) => d.storageKey && isPropertyDocumentType(d.docType));
  const media = (input.media ?? []).filter((m) => m.url.trim());
  const submit = !!input.submit;

  let existingId = input.id;
  let existingStatus: string | null = null;
  if (existingId) {
    const [existing] = await db
      .select({ id: property.id, status: property.status })
      .from(property)
      .where(and(eq(property.id, existingId), eq(property.ownerUserId, uid)))
      .limit(1);
    if (!existing) throw new Error("Listing not found");
    if (!["draft", "changes_requested", "rejected"].includes(existing.status)) {
      throw new Error("Only drafts or listings sent back for changes can be edited");
    }
    existingStatus = existing.status;
  }

  const settings = await getProperties();
  const currency = (input.currency || "NGN").toUpperCase();
  const fee = computeListingFee({
    valueMinor: priceMinor,
    currency,
    flatFeeMinor: settings.flatListingFeeMinor,
    fxRates: { ...settings.fxRates, NGN: 1 },
  });

  const existingDocs = existingId
    ? await db
        .select({ docType: propertyDocument.docType })
        .from(propertyDocument)
        .where(eq(propertyDocument.propertyId, existingId))
    : [];
  const availableDocTypes = new Set<string>([...existingDocs.map((d) => d.docType), ...docs.map((d) => d.docType)]);

  if (submit) {
    if (!input.description?.trim() || input.description.trim().length < 40) {
      throw new Error("Add a description of at least 40 characters");
    }
    if (!input.city?.trim() || !input.state?.trim()) throw new Error("City and state are required");
    if (!media.length) throw new Error("Add at least one property photo");
    const missing = REQUIRED_PROPERTY_DOCUMENTS[input.kind].filter((d) => !availableDocTypes.has(d));
    if (missing.length) {
      throw new Error(`Attach the required documents: ${missing.join(", ").replaceAll("_", " ")}`);
    }
  }

  const [lister] = await db
    .select({ id: propertyListerProfile.id })
    .from(propertyListerProfile)
    .where(eq(propertyListerProfile.userId, uid))
    .limit(1);

  const values = {
    ownerUserId: uid,
    listerProfileId: lister?.id ?? null,
    title,
    description: input.description?.trim() || null,
    kind: input.kind,
    category: input.category,
    propertyType: input.propertyType || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    country: input.country?.trim() || "Nigeria",
    sizeSqm: positiveInt(input.sizeSqm),
    sizeAcres: positiveNumber(input.sizeAcres),
    bedrooms: positiveInt(input.bedrooms),
    bathrooms: positiveInt(input.bathrooms),
    priceMinor,
    priceNgnMinor: toNgnMinor(priceMinor, currency, { ...settings.fxRates, NGN: 1 }),
    currency,
    pricePeriod: input.pricePeriod || "one_off",
    isBulkLand: input.kind === "bulk_land",
    minimumAcreage: input.kind === "bulk_land" ? positiveNumber(input.minimumAcreage) ?? 1 : null,
    contactName: input.contactName?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    flatFeeMinor: fee.flatFeeMinor,
    rateBps: fee.rateBps,
    feeAmountMinor: fee.totalFeeMinor,
    feeCurrency: "NGN",
    documentStatus: availableDocTypes.size ? "pending" : "missing",
    status: submit
      ? settings.approvalRequired
        ? "pending_approval"
        : "approved_awaiting_payment"
      : existingStatus ?? "draft",
    rejectionReason: submit ? null : undefined,
  };

  let id = existingId;
  let slug: string;
  if (id) {
    const [row] = await db
      .update(property)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(property.id, id), eq(property.ownerUserId, uid)))
      .returning({ slug: property.slug });
    slug = row.slug;
    await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, id));
  } else {
    const base = slugify(title) || "property";
    slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const [row] = await db.insert(property).values({ ...values, slug }).returning({ id: property.id });
    id = row.id;
  }

  if (media.length) {
    await db.insert(propertyMedia).values(
      media.map((m, i) => ({
        propertyId: id!,
        url: m.url,
        kind: m.kind || "image",
        caption: m.caption || null,
        sortOrder: i,
      })),
    );
  }
  if (docs.length) {
    await db.insert(propertyDocument).values(
      docs.map((d) => ({
        propertyId: id!,
        ownerUserId: uid,
        docType: d.docType,
        storageKey: d.storageKey,
        fileName: d.fileName || null,
        mimeType: d.mimeType || null,
        sizeBytes: d.sizeBytes != null ? Math.round(d.sizeBytes) : null,
      })),
    );
  }

  await db.insert(propertyEvent).values({
    propertyId: id,
    userId: uid,
    eventType: submit ? "submit" : "draft",
    metadata: { status: values.status },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/properties/listings");
  revalidatePath("/properties");
  return { id: id!, slug, status: values.status };
}

export async function archiveProperty(id: string) {
  const uid = await requireUserId();
  await db
    .update(property)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(property.id, id), eq(property.ownerUserId, uid)));
  revalidatePath("/dashboard/properties/listings");
}

export async function deleteDraftProperty(id: string) {
  const uid = await requireUserId();
  const [existing] = await db
    .select({ status: property.status })
    .from(property)
    .where(and(eq(property.id, id), eq(property.ownerUserId, uid)))
    .limit(1);
  if (!existing) throw new Error("Listing not found");
  if (existing.status !== "draft") throw new Error("Only drafts can be deleted");
  await db.delete(property).where(and(eq(property.id, id), eq(property.ownerUserId, uid)));
  revalidatePath("/dashboard/properties/listings");
}

export async function getAvailableDocumentTypes(propertyId: string): Promise<string[]> {
  const uid = await requireUserId();
  const [owned] = await db
    .select({ id: property.id })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.ownerUserId, uid)))
    .limit(1);
  if (!owned) return [];
  const rows = await db
    .select({ docType: propertyDocument.docType })
    .from(propertyDocument)
    .where(eq(propertyDocument.propertyId, propertyId));
  return Array.from(new Set(rows.map((r) => r.docType)));
}

export async function countOwnerProperties(): Promise<number> {
  const uid = await requireUserId();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(property)
    .where(eq(property.ownerUserId, uid));
  return row?.n ?? 0;
}


export async function markPropertyOutcome(id: string, outcome: "sold" | "leased" | "rented" | "archived") {
  const uid = await requireUserId();
  if (!["sold", "leased", "rented", "archived"].includes(outcome)) throw new Error("Unsupported outcome");
  const [row] = await db
    .select({ id: property.id, status: property.status })
    .from(property)
    .where(and(eq(property.id, id), eq(property.ownerUserId, uid)))
    .limit(1);
  if (!row) throw new Error("Listing not found");
  if (row.status !== "published") throw new Error("Only live listings can be closed");

  await db.update(property).set({ status: outcome, updatedAt: new Date() }).where(eq(property.id, id));
  await db.update(propertyTransaction)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(
      eq(propertyTransaction.propertyId, id),
      inArray(propertyTransaction.status, ["pending", "paid"]),
    ));

  revalidatePath("/properties");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/properties/listings");
  revalidatePath("/dashboard/properties/transactions");
  revalidatePath("/admin/properties");
  return outcome;
}
