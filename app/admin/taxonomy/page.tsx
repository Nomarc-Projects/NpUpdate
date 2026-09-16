import { AdminTaxonomy } from "@/components/admin/admin-taxonomy";
import { listTaxonomy } from "@/lib/services/taxonomy";
import type { TaxonomyKind } from "@/lib/taxonomy-kinds";

const KINDS = ["occupation", "skill", "service_category", "product_category", "industry"];

export default async function AdminTaxonomyPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const active = (KINDS.includes(kind ?? "") ? kind : "occupation") as TaxonomyKind;
  const terms = await listTaxonomy(active);
  return <AdminTaxonomy initialKind={active} terms={terms} />;
}
