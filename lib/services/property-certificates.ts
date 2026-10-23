import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { property, propertyCertificate, propertyTransaction } from "@/lib/db/schema";

export async function getPublicCertificateByNo(certificateNo: string) {
  const [row] = await db
    .select({
      certificateNo: propertyCertificate.certificateNo,
      issuedAt: propertyCertificate.issuedAt,
      transactionStatus: propertyTransaction.status,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertyState: property.state,
    })
    .from(propertyCertificate)
    .innerJoin(propertyTransaction, eq(propertyTransaction.id, propertyCertificate.transactionId))
    .leftJoin(property, eq(property.id, propertyCertificate.propertyId))
    .where(eq(propertyCertificate.certificateNo, certificateNo.trim().toUpperCase()))
    .limit(1);
  if (!row) return null;
  return {
    certificateNo: row.certificateNo,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    transactionStatus: row.transactionStatus,
    propertyTitle: row.propertyTitle ?? "Property removed",
    propertyLocation: [row.propertyCity, row.propertyState].filter(Boolean).join(", "),
  };
}
