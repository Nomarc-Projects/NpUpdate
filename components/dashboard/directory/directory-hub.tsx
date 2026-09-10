"use client";

import { useState } from "react";
import { DashboardTabs } from "@/components/dashboard/kit/dashboard-tabs";
import { PeopleDirectory } from "@/components/dashboard/directory/people-directory";
import { CompaniesDirectory } from "@/components/dashboard/directory/companies-directory";
import { CatalogueDirectory } from "@/components/dashboard/directory/catalogue-directory";
import type { PeopleRow } from "@/lib/services/directory";
import type { CompanyCard } from "@/lib/services/company";
import type { CatalogueEntry } from "@/lib/services/directory-catalogue";
import type { CatalogueKind } from "@/lib/constants/catalogue-categories";

const TABS = [
  { key: "people", label: "People" },
  { key: "companies", label: "Companies" },
  { key: "institutions", label: "Institutions" },
  { key: "ministries", label: "Government Ministries" },
];

/** The single Directory page: People · Companies · Institutions · Government
 *  Ministries. Each tab keeps its own table so the shared component is a thin
 *  tab shell that swaps the dataset underneath. Initial tab honours ?tab=. */
export function DirectoryHub({
  people, companies, institutions, ministries, initialTab = "people",
}: {
  people: PeopleRow[];
  companies: CompanyCard[];
  institutions: CatalogueEntry[];
  ministries: CatalogueEntry[];
  initialTab?: string;
}) {
  const [active, setActive] = useState(
    TABS.some((t) => t.key === initialTab) ? initialTab : "people",
  );

  return (
    <div className="px-6 py-6 md:px-8">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1e1e1e] dark:text-white">Directory</h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">
          Discover and connect with professionals, companies, institutions, and government ministries.
        </p>
      </div>

      <DashboardTabs tabs={TABS} active={active} onChange={setActive} />

      <div className="mt-5">
        {active === "people" && <PeopleDirectory rows={people} />}
        {active === "companies" && <CompaniesDirectory rows={companies} />}
        {active === "institutions" && (
          <CatalogueDirectory kind={"institution" as CatalogueKind} rows={institutions} />
        )}
        {active === "ministries" && (
          <CatalogueDirectory kind={"ministry" as CatalogueKind} rows={ministries} />
        )}
      </div>
    </div>
  );
}