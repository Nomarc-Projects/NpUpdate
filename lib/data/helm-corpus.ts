/**
 * Helm (consultant) domain corpus — the curated professional knowledge the AI
 * consultant is grounded on.
 *
 * Ported from `helm/src/helm/corpus/*.md` so the VM-less (`local`) backend can
 * retrieve against it without the Python service. The markdown was split on
 * `##` headings into 33 chunks; each entry is already a sensible retrieval
 * chunk and is rendered on its own, so bodies are self-contained.
 *
 * Citation string matches the RAG store's (store.py KnowledgeChunk.citation):
 * `"{title} — {section}"`, or just the title when a chunk has no section.
 *
 * Unlike the pgvector store there is no per-chunk discipline metadata, so the
 * local retriever has no discipline filter — discipline adaptation is carried by
 * the system prompt instead (see DISCIPLINE_FRAMING in lib/helm/assistant-local).
 *
 * Keep in sync with the .md originals: they are the source of truth for the VM
 * backend's indexing (`helm ingest`), this file is the source of truth for local.
 */
export type CorpusChunk = {
  /** Stable id within the namespace — the source document slug. */
  sourceRef: string;
  title: string;
  /** `##` heading this chunk came from; empty for a document's preamble. */
  section: string;
  body: string;
};

export const HELM_CORPUS: CorpusChunk[] = [
  {
    sourceRef: "materials-and-site",
    title: "Materials, site management & HSE",
    section: "",
    body: "General primer on common construction materials in Nigeria and good site practice.\nPrices, grades and availability vary by region and over time — confirm current market\nrates and product specifications with suppliers, and design to the relevant standards.",
  },
  {
    sourceRef: "materials-and-site",
    title: "Materials, site management & HSE",
    section: "Common materials",
    body: "- **Cement** — widely used for concrete, mortar and rendering; specified by strength\n  class. Confirm the class and standard required for the structural application.\n- **Reinforcement steel (rebar)** — deformed bars specified by diameter and grade; verify\n  grade, source and test certificates against the structural drawings and specification.\n- **Sandcrete blocks** — common walling unit; specify hollow/solid, size and minimum\n  strength, and check compliance with the specification (block strength is a frequent\n  quality issue on site).\n- **Aggregates & sand** — graded and cleaned appropriately for concrete; contamination\n  and grading affect concrete quality.\n- **Timber, roofing sheets, finishes** — selected for durability in the local climate.",
  },
  {
    sourceRef: "materials-and-site",
    title: "Materials, site management & HSE",
    section: "Concrete quality",
    body: "Concrete performance depends on mix design, materials, placing, compaction and curing.\nSpecify by strength class and follow the specified cover to reinforcement for durability\nand fire/structural protection — confirm the required cover from the structural\ndrawings/specification rather than assuming a value.",
  },
  {
    sourceRef: "materials-and-site",
    title: "Materials, site management & HSE",
    section: "Site management & HSE",
    body: "- Plan site layout, access, storage and security at mobilisation.\n- Enforce health & safety: PPE, edge protection, safe scaffolding and excavation support,\n  method statements and risk assessments for hazardous activities.\n- Run quality control: inspection and test plans, checking works against drawings and\n  specifications before covering up, and recording approvals.\n- Supervise workmanship and keep site records (diaries, instructions, photos) — these\n  matter for progress, quality and any later claim or dispute.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "",
    body: "Each built-environment profession in Nigeria has a **statutory registration council**\n(regulates the right to practise) and usually a **professional association/institute**\n(membership, standards, CPD). Practitioners generally must register with the relevant\ncouncil to practise and use the protected title. Registration requirements, fees and\nCPD rules change over time — always confirm current requirements directly with the body.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Engineering",
    body: "- **COREN** — Council for the Regulation of Engineering in Nigeria: the statutory\n  regulator of engineering practice (engineers, technologists, technicians, craftsmen).\n- **NSE** — Nigerian Society of Engineers: the professional association for engineers.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Architecture",
    body: "- **ARCON** — Architects Registration Council of Nigeria: the statutory regulator;\n  architects must be registered to practise.\n- **NIA** — Nigerian Institute of Architects: the professional body for architects.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Quantity surveying",
    body: "- **QSRBN** — Quantity Surveyors Registration Board of Nigeria: the statutory regulator.\n- **NIQS** — Nigerian Institute of Quantity Surveyors: the professional institute.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Building",
    body: "- **CORBON** — Council of Registered Builders of Nigeria: the statutory regulator of\n  building practice.\n- **NIOB** — Nigerian Institute of Building: the professional body for builders.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Surveying (land / geomatics)",
    body: "- **SURCON** — Surveyors Council of Nigeria: the statutory regulator.\n- **NIS** — Nigerian Institution of Surveyors: the professional institution.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Town planning",
    body: "- **TOPREC** — Town Planners Registration Council of Nigeria: the statutory regulator.\n- **NITP** — Nigerian Institute of Town Planners: the professional institute.",
  },
  {
    sourceRef: "nigerian-professional-bodies",
    title: "Nigerian construction professional & regulatory bodies",
    section: "Codes and approvals",
    body: "The **National Building Code** sets minimum standards for building design, construction,\nand maintenance in Nigeria. Building/development approvals and physical-planning permits\nare administered at the **state** level (e.g. state physical planning / building-control\nagencies), so the exact process, documents and fees vary by state — confirm with the\nrelevant state authority for a given project.",
  },
  {
    sourceRef: "nomarc-platform",
    title: "Nomarc Data Gig — the platform",
    section: "",
    body: "Nomarc Data Gig is a digital marketplace connecting Nigeria's construction ecosystem,\noperated by Nomadic Architects. It brings three audiences together in one place:\n\n- **Professionals** — architects, engineers, quantity surveyors, project managers,\n  builders, surveyors and other construction practitioners who find work, hire, showcase\n  a portfolio, manage projects, and use professional tools.\n- **Exhibitors** — material suppliers and brands who list products, receive orders and\n  quote requests, and manage a storefront.\n- **Buyers / clients** — people and organisations sourcing professionals or materials.",
  },
  {
    sourceRef: "nomarc-platform",
    title: "Nomarc Data Gig — the platform",
    section: "Helm — the AI consultant",
    body: "Helm is Nomarc's AI consultant for construction professionals. It adapts to the\nprofessional's discipline, answers questions grounded in the platform's knowledge base,\nreviews documents a professional uploads, and can draft changes to a project board (as\nconfirm-gated proposals the professional approves before anything is applied). A lighter\npublic version of Helm answers general questions for visitors on the marketing site.\n\nHelm is available on paid plans (Plus and above). Answers are advisory: professionals\nshould verify anything safety-critical, contractual, or regulatory against the actual\ncode, contract, or current rates for their project.",
  },
  {
    sourceRef: "nomarc-platform",
    title: "Nomarc Data Gig — the platform",
    section: "Working on the platform",
    body: "Professionals can manage delivery on the **Project Management** board (projects, tasks,\ncolumns, milestones), keep a company page and portfolio, browse and post jobs, request\nquotes from exhibitors (RFQ), and use business templates. Exhibitors manage products,\norders, customers and a payout wallet.",
  },
  {
    sourceRef: "procurement-and-contracts",
    title: "Procurement routes & construction contracts",
    section: "",
    body: "This is a general primer on how construction work is procured and the contract concepts\nthat recur. Specific rights and obligations always come from the **actual contract** on a\nproject — treat this as orientation, not legal advice, and read the executed contract.",
  },
  {
    sourceRef: "procurement-and-contracts",
    title: "Procurement routes & construction contracts",
    section: "Common procurement routes",
    body: "- **Traditional (design-bid-build)** — the client's consultants complete the design, then\n  a contractor is selected to build it. Clear roles; design and construction are separate.\n- **Design and build** — one contractor is responsible for both design and construction,\n  often against the client's requirements. Single point of responsibility; faster overlap.\n- **Management routes** — a management contractor or construction manager coordinates\n  works packages let to trade contractors. Suited to large/complex or fast-track projects.",
  },
  {
    sourceRef: "procurement-and-contracts",
    title: "Procurement routes & construction contracts",
    section: "Contract pricing mechanisms",
    body: "- **Lump sum** — a fixed price for a defined scope (usually via a priced bill or schedule).\n- **Remeasurement / measure-and-value** — priced on actual quantities measured as built,\n  against agreed rates. Common on civil works with uncertain quantities.\n- **Cost reimbursable / cost-plus** — actual cost plus a fee; used when scope is unclear.",
  },
  {
    sourceRef: "procurement-and-contracts",
    title: "Procurement routes & construction contracts",
    section: "Standard forms",
    body: "Projects use standard contract families rather than bespoke documents where possible —\nfor example **FIDIC** forms on civil/infrastructure and international work, and JCT-style\nbuilding contracts. Nigerian public procurement also follows the Public Procurement Act\nframework. Always use the specific edition/amendments named in the contract.",
  },
  {
    sourceRef: "procurement-and-contracts",
    title: "Procurement routes & construction contracts",
    section: "Key contract terms to know",
    body: "- **Variations / change orders** — instructed changes to scope, valued under the contract.\n- **Interim payment certificates** — periodic payments for work done and materials.\n- **Retention** — a percentage withheld from payments as security, released in stages\n  (typically part at completion, the balance after the defects liability period).\n- **Defects liability period (DLP)** — the period after completion in which the contractor\n  must remedy defects.\n- **Liquidated damages** — a pre-agreed sum payable by the contractor for late completion.\n- **Performance bond / advance payment guarantee** — security instruments protecting the\n  client. **Retention %, DLP length, LD rate and bond values are project-specific — read\n  them off the actual contract; do not assume standard figures.**\n- **Extension of time (EOT) & claims** — mechanisms for adjusting time/cost for defined\n  events; notice requirements and timelines in the contract must be followed precisely.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "",
    body: "A building or civil project typically moves through these phases. The names vary by\npractice (RIBA Plan of Work, client-specific stage gates), but the intent is consistent.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "1. Inception & brief",
    body: "Define the client's needs, budget, site and objectives. Produce a project brief and\nappoint the initial consultants. Establish feasibility (technical, financial, planning).",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "2. Feasibility & concept design",
    body: "Test whether the brief is achievable on the site and budget. The architect/engineers\ndevelop concept options; the quantity surveyor prepares an order-of-magnitude cost.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "3. Design development (schematic → detailed)",
    body: "Develop the chosen concept into coordinated architectural, structural and MEP designs,\nspecifications and drawings sufficient for approvals and tendering. Cost plans are\nrefined as the design firms up.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "4. Statutory approvals",
    body: "Obtain planning/building-control approval from the relevant state authority. Requirements\nand timelines vary by state and project type.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "5. Procurement & tendering",
    body: "Select the procurement route and contractor(s). Prepare tender documents (drawings,\nspecifications, bills of quantities), invite and evaluate bids, and award the contract.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "6. Construction",
    body: "The contractor mobilises, executes the works, and is administered under the contract:\ninterim valuations and payment certificates, variations, quality and safety control,\nprogress monitoring against the programme, and management of risk and claims.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "7. Completion & handover",
    body: "Practical/substantial completion, commissioning of services, snagging (defects list),\nhandover of the building and O&M documentation, and release of part of the retention.",
  },
  {
    sourceRef: "project-lifecycle",
    title: "Construction project lifecycle",
    section: "8. Defects liability & final account",
    body: "During the defects liability period the contractor makes good defects; at its end the\nfinal account is agreed and the remaining retention released. Post-occupancy review and\noperation follow.",
  },
  {
    sourceRef: "quantity-surveying",
    title: "Quantity surveying & cost management",
    section: "",
    body: "Core concepts a quantity surveyor (QS) works with across a project. General primer —\napply the standard method of measurement and the contract terms actually in force.",
  },
  {
    sourceRef: "quantity-surveying",
    title: "Quantity surveying & cost management",
    section: "Key documents",
    body: "- **Bill of Quantities (BOQ)** — an itemised, measured list of the works with quantities,\n  used for tendering, pricing and valuation. Prepared to a standard method of measurement.\n- **Bill of Engineering Measurement & Evaluation (BEME)** — the equivalent measured bill\n  used on engineering/civil works (roads, bridges, water, etc.) in Nigeria.\n- **Standard method of measurement** — the ruleset governing how quantities are measured\n  so bills are consistent and comparable between tenderers.",
  },
  {
    sourceRef: "quantity-surveying",
    title: "Quantity surveying & cost management",
    section: "Process",
    body: "- **Taking off** — measuring quantities from drawings and specifications.\n- **Cost planning / estimating** — establishing and controlling the budget as the design\n  develops, from order-of-magnitude estimates to a firm cost plan.\n- **Tender pricing & evaluation** — pricing the bill and comparing bids on a like basis.\n- **Interim valuations & payment certificates** — measuring work done each period to\n  certify payment to the contractor, accounting for materials on site and retention.\n- **Variations valuation** — pricing instructed changes using bill rates where applicable.\n- **Final account** — agreeing the final contract sum after all variations, remeasurement\n  and claims are resolved.",
  },
  {
    sourceRef: "quantity-surveying",
    title: "Quantity surveying & cost management",
    section: "Cost control principles",
    body: "Track committed vs. forecast vs. budget throughout; flag variances early; value\nvariations and claims promptly; and keep an auditable record of measurements and\nagreements. Material prices in Nigeria can be volatile — base estimates on **current**\nmarket rates and state the pricing date and assumptions.",
  },
];
