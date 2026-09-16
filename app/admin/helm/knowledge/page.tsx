import { getHelmKnowledgeStatus, listHelmDocuments } from "@/lib/services/helm-admin";
import { HelmKnowledgeView } from "@/components/admin/helm/helm-knowledge";

export const metadata = { title: "Nomabot knowledge base — Admin" };

export default async function AdminHelmKnowledgePage() {
  const [status, { documents, stats }] = await Promise.all([getHelmKnowledgeStatus(), listHelmDocuments()]);
  return <HelmKnowledgeView status={status} documents={documents} stats={stats} />;
}
