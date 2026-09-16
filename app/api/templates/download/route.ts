import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";

export const runtime = "nodejs";

const TEMPLATES: Record<string, { title: string; category: string; fileType: string; sections: { heading: string; content: string }[] }> = {
  subcontract: {
    title: "Subcontractor Agreement",
    category: "Contracts",
    fileType: "DOCX",
    sections: [
      { heading: "1. Parties", content: "This Agreement is entered into between [Main Contractor Name] ('the Contractor') and [Subcontractor Name] ('the Subcontractor').\n\nContractor Address: _______________\nSubcontractor Address: _______________\nDate of Agreement: _______________" },
      { heading: "2. Scope of Works", content: "The Subcontractor shall carry out and complete the following works:\n\nProject: _______________\nLocation: _______________\nDescription of works:\n- \n- \n- \n\nRelevant drawings: _______________\nSpecification references: _______________" },
      { heading: "3. Contract Sum", content: "The Contract Sum for the works is ₦_______________ (Naira), payable as follows:\n\nMobilisation: ___%\nInterim valuations: Monthly / Fortnightly\nRetention: 5% (released 50% at practical completion, 50% at end of defects period)\nFinal payment: Within 28 days of final account agreement" },
      { heading: "4. Programme", content: "Commencement date: _______________\nCompletion date: _______________\nDuration: _______________ weeks\n\nThe Subcontractor shall comply with the Master Programme and attend progress meetings as required." },
      { heading: "5. Insurance & Liability", content: "The Subcontractor shall maintain:\n- Employers' liability insurance: minimum ₦_______________\n- Public liability insurance: minimum ₦_______________\n- Professional indemnity (if applicable): ₦_______________\n\nCertificates to be provided before commencement." },
      { heading: "6. Dispute Resolution", content: "Disputes shall be resolved by:\n1. Direct negotiation between parties\n2. Mediation under the rules of the Lagos Multi-Door Courthouse\n3. Arbitration under the Arbitration and Conciliation Act\n\nGoverning law: Federal Republic of Nigeria" },
    ],
  },
  boq: {
    title: "Bill of Quantities (BOQ)",
    category: "Procurement",
    fileType: "XLSX",
    sections: [
      { heading: "Preliminaries", content: "Item | Description | Unit | Qty | Rate (₦) | Amount (₦)\n-----|-------------|------|-----|----------|------------\n1.01 | Site establishment & mobilisation | LS | 1 | | \n1.02 | Site security & hoarding | Month | 12 | | \n1.03 | Temporary facilities (office, stores) | LS | 1 | | \n1.04 | Insurance (CAR, third party) | LS | 1 | | \n1.05 | Performance bond | LS | 1 | | " },
      { heading: "Substructure", content: "Item | Description | Unit | Qty | Rate (₦) | Amount (₦)\n-----|-------------|------|-----|----------|------------\n2.01 | Excavation to reduced level | m³ | | | \n2.02 | Excavation for foundation trenches | m³ | | | \n2.03 | Hardcore filling and compaction | m³ | | | \n2.04 | Blinding concrete (50mm) | m² | | | \n2.05 | Reinforced concrete strip foundation | m³ | | | \n2.06 | Blockwork to DPC level | m² | | | " },
      { heading: "Superstructure", content: "Item | Description | Unit | Qty | Rate (₦) | Amount (₦)\n-----|-------------|------|-----|----------|------------\n3.01 | 225mm sandcrete blockwork | m² | | | \n3.02 | 150mm sandcrete blockwork (partitions) | m² | | | \n3.03 | Reinforced concrete columns | m³ | | | \n3.04 | Reinforced concrete beams | m³ | | | \n3.05 | Reinforced concrete suspended slab | m² | | | " },
      { heading: "Finishes", content: "Item | Description | Unit | Qty | Rate (₦) | Amount (₦)\n-----|-------------|------|-----|----------|------------\n4.01 | Internal cement/sand rendering | m² | | | \n4.02 | Emulsion paint (3 coats) | m² | | | \n4.03 | Floor tiling (600×600 porcelain) | m² | | | \n4.04 | Wall tiling (kitchen & bathrooms) | m² | | | \n4.05 | POP ceiling | m² | | | " },
      { heading: "Summary", content: "Section | Amount (₦)\n--------|----------\nPreliminaries | \nSubstructure | \nSuperstructure | \nFinishes | \nMechanical & Electrical | \nExternal Works | \n\nSUB-TOTAL | \nContingency (5%) | \nVAT (7.5%) | \nGRAND TOTAL | " },
    ],
  },
  programme: {
    title: "Construction Programme",
    category: "Programme",
    fileType: "XLSX",
    sections: [
      { heading: "Project Information", content: "Project Name: _______________\nClient: _______________\nContractor: _______________\nConsultant: _______________\nStart Date: _______________\nContract Period: _______________ weeks\nCompletion Date: _______________" },
      { heading: "Programme Phases", content: "Phase | Activity | Duration | Start | Finish | Dependencies\n------|----------|----------|-------|--------|------------\n1 | Mobilisation & site setup | 2 wks | | | \n2 | Demolition & clearing | 1 wk | | | 1\n3 | Substructure | 6 wks | | | 2\n4 | Superstructure (frame) | 8 wks | | | 3\n5 | Roofing | 3 wks | | | 4\n6 | M&E first fix | 4 wks | | | 4\n7 | Block/plaster | 6 wks | | | 5\n8 | Finishes | 8 wks | | | 6,7\n9 | M&E second fix | 3 wks | | | 8\n10 | External works | 4 wks | | | 8\n11 | Snagging & handover | 2 wks | | | 9,10" },
      { heading: "Milestones", content: "Milestone | Target Date | Actual Date | Status\n----------|-------------|-------------|-------\nSite possession | | | \nFoundation complete | | | \nFrame complete | | | \nRoof watertight | | | \nM&E commissioning | | | \nPractical completion | | | \nDefects period end | | | " },
    ],
  },
  rams: {
    title: "Risk Assessment & Method Statement",
    category: "Health & Safety",
    fileType: "DOCX",
    sections: [
      { heading: "1. Activity Details", content: "Activity: _______________\nLocation: _______________\nDate of Assessment: _______________\nAssessor: _______________\nReview Date: _______________\nProject: _______________\nContractor: _______________" },
      { heading: "2. Risk Assessment", content: "Hazard | Who at Risk | Severity (1-5) | Likelihood (1-5) | Risk Rating | Control Measures | Residual Risk\n-------|-------------|----------------|------------------|-------------|-----------------|---------------\nWorking at height | Operatives | 5 | 3 | 15 (High) | Scaffolding, harness, edge protection | 5 (Low)\nManual handling | Operatives | 3 | 4 | 12 (Med) | Mechanical aids, team lifting, training | 4 (Low)\nElectrical contact | All | 5 | 2 | 10 (Med) | Isolation, LOTO, competent persons | 3 (Low)\nFalling objects | All on site | 4 | 3 | 12 (Med) | Toe boards, netting, exclusion zones | 4 (Low)" },
      { heading: "3. Method Statement", content: "Step | Activity | Responsible | Equipment | Safety Measures\n-----|----------|-------------|-----------|----------------\n1 | Set up exclusion zone & signage | Foreman | Barriers, signs | Briefing, permit\n2 | Erect scaffolding / access equipment | Scaffolder | Scaffold materials | Scaffold inspection tag\n3 | Commence works | Operatives | Per task | PPE, supervision\n4 | Ongoing inspections | Supervisor | Checklist | Hourly visual check\n5 | Clean up & demobilise | All | Waste skips | Waste segregation" },
      { heading: "4. Emergency Procedures", content: "First aider on site: _______________\nFirst aid kit location: _______________\nNearest hospital: _______________\nEmergency assembly point: _______________\nFire extinguisher locations: _______________\n\nIn case of emergency: Call 112 / site emergency number _______________" },
    ],
  },
  "daily-report": {
    title: "Site Daily Report",
    category: "Reports",
    fileType: "DOCX",
    sections: [
      { heading: "General Information", content: "Project: _______________\nDate: _______________\nReport No.: _______________\nWeather: Morning: _________ Afternoon: _________\nTemperature: _____°C\nReported by: _______________" },
      { heading: "Labour on Site", content: "Trade | Contractor | No. of Workers | Hours\n------|-----------|----------------|------\nForeman | | | \nMasons | | | \nCarpenters | | | \nSteel fixers | | | \nElectricians | | | \nPlumbers | | | \nLabourers | | | \n\nTOTAL | | | " },
      { heading: "Plant & Equipment", content: "Item | Status | Hours Worked | Remarks\n-----|--------|-------------|--------\nConcrete mixer | | | \nExcavator | | | \nGenerator | | | \nCrane | | | \nScaffolding | | | " },
      { heading: "Works Carried Out", content: "Time | Activity | Location | Progress | Remarks\n-----|----------|----------|----------|--------\n07:00 | | | | \n09:00 | | | | \n11:00 | | | | \n13:00 | | | | \n15:00 | | | | " },
      { heading: "Delays / Issues", content: "Issue | Cause | Impact | Action Taken\n------|-------|--------|-------------\n | | | \n | | | " },
    ],
  },
  snagging: {
    title: "Snagging / Defects Schedule",
    category: "Quality",
    fileType: "XLSX",
    sections: [
      { heading: "Project Details", content: "Project: _______________\nInspection Date: _______________\nInspected by: _______________\nContractor: _______________\nBuilding/Block: _______________\nUnit/Area: _______________" },
      { heading: "Defects Register", content: "No. | Location | Trade | Description | Priority | Photo Ref | Assigned To | Due Date | Status | Closed Date\n----|----------|-------|-------------|----------|-----------|-------------|----------|--------|------------\n001 | | | | High/Med/Low | | | | Open | \n002 | | | | | | | | Open | \n003 | | | | | | | | Open | \n004 | | | | | | | | Open | \n005 | | | | | | | | Open | " },
      { heading: "Summary", content: "Priority | Total | Open | Closed | % Complete\n---------|-------|------|--------|----------\nHigh | | | | \nMedium | | | | \nLow | | | | \nTOTAL | | | | " },
    ],
  },
  "material-spec": {
    title: "Material Specification Sheet",
    category: "Specifications",
    fileType: "DOCX",
    sections: [
      { heading: "Material Details", content: "Material: _______________\nTrade: _______________\nSpecification Ref: _______________\nDrawing Ref: _______________\nSupplier: _______________\nManufacturer: _______________" },
      { heading: "Technical Specification", content: "Property | Requirement | Standard\n---------|-------------|--------\nGrade/Class | | \nDimensions | | \nColour/Finish | | \nStrength | | \nDurability | | \nFire rating | | \nThermal conductivity | | \nMoisture resistance | | " },
      { heading: "Compliance", content: "Standard | Requirement | Compliant (Y/N)\n---------|-------------|---------------\nNIS / SON standard | | \nBS EN standard | | \nASTM standard | | \nManufacturer's warranty | | \nSample approved | | " },
    ],
  },
  valuation: {
    title: "Payment Application / Valuation",
    category: "Finance",
    fileType: "XLSX",
    sections: [
      { heading: "Application Details", content: "Project: _______________\nApplication No.: _______________\nValuation Period: _______________ to _______________\nContractor: _______________\nContract Sum: ₦_______________" },
      { heading: "Valuation Summary", content: "Item | Description | Contract Value (₦) | Previous (₦) | This Period (₦) | Cumulative (₦) | % Complete\n-----|-------------|-------------------|-------------|----------------|----------------|----------\n1 | Preliminaries | | | | | \n2 | Substructure | | | | | \n3 | Superstructure | | | | | \n4 | Finishes | | | | | \n5 | M&E | | | | | \n6 | External | | | | | " },
      { heading: "Payment Calculation", content: "Gross valuation: ₦_______________\nLess retention (5%): ₦_______________\nLess previous payments: ₦_______________\nAmount due this certificate: ₦_______________\n\nPayment due within 28 days of certificate date." },
    ],
  },
  "fee-proposal": {
    title: "Fee Proposal & Scope of Services",
    category: "Contracts",
    fileType: "DOCX",
    sections: [
      { heading: "1. Introduction", content: "Dear [Client Name],\n\nThank you for inviting [Firm Name] to submit a fee proposal for [Project Name]. We are pleased to present our scope of services and fee structure for your consideration." },
      { heading: "2. Scope of Services", content: "Stage | Deliverables | Duration\n------|-------------|--------\nBrief & Feasibility | Site analysis, feasibility report | 2 weeks\nConcept Design | Sketch plans, 3D visualisations, preliminary cost estimate | 3 weeks\nDesign Development | Detailed drawings, outline specification | 4 weeks\nTechnical Design | Working drawings, structural coordination, M&E layout | 6 weeks\nContract Administration | Tender action, site visits, valuations, practical completion | Project duration" },
      { heading: "3. Fee Schedule", content: "Stage | Fee (₦) | % of Total\n------|---------|----------\nBrief & Feasibility | | \nConcept Design | | \nDesign Development | | \nTechnical Design | | \nContract Administration | | \nTOTAL | | 100%" },
      { heading: "4. Terms", content: "Payment: 50% upfront per stage, 50% on deliverable acceptance.\nAdditional services: Charged at ₦___/hour for principal, ₦___/hour for assistant.\nExpenses: Travel, printing, and statutory fees are reimbursable at cost.\nValidity: This proposal is valid for 30 days from the date above." },
    ],
  },
  "pc-certificate": {
    title: "Practical Completion Certificate",
    category: "Handover",
    fileType: "PDF",
    sections: [
      { heading: "Certificate Details", content: "Certificate No.: _______________\nProject: _______________\nEmployer: _______________\nContractor: _______________\nContract Date: _______________\nContract Sum: ₦_______________" },
      { heading: "Certification", content: "I/We hereby certify that Practical Completion of the Works has been achieved on:\n\nDate of Practical Completion: _______________\n\nSubject to the outstanding items listed in the attached snagging schedule, the Works are substantially complete and fit for their intended purpose." },
      { heading: "Outstanding Items", content: "The following items remain to be completed during the Defects Liability Period:\n\n1. _______________\n2. _______________\n3. _______________\n\nAll items to be completed within _______________ days." },
      { heading: "Signatures", content: "Contract Administrator / Architect:\nName: _______________\nSignature: _______________\nDate: _______________\n\nContractor:\nName: _______________\nSignature: _______________\nDate: _______________\n\nEmployer:\nName: _______________\nSignature: _______________\nDate: _______________" },
    ],
  },
};

export async function GET(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !TEMPLATES[id]) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const t = TEMPLATES[id];
  let body = `${t.title}\n${"=".repeat(t.title.length)}\n${t.category} Template\n\n`;
  for (const s of t.sections) {
    body += `\n${s.heading}\n${"-".repeat(s.heading.length)}\n${s.content}\n`;
  }

  const ext = t.fileType === "XLSX" ? "txt" : t.fileType === "PDF" ? "txt" : "txt";
  const filename = `${t.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_")}_Template.${ext}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
