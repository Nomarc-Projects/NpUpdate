/** Shared demo job data — used by the Jobs browse (fallback when DB is sparse)
 *  and the full job detail page so a clicked sample job still resolves. */
export type SampleJob = {
  id: string; title: string; company: string; location: string;
  desc: string; tags: string[]; salary: string; time: string;
  applicants?: number; category?: string;
  /** Poster identity — set for real DB jobs so `JobDetail` can link to a chat. */
  ownerUserId?: string; recruiterName?: string;
};

export const JOB_OVERVIEW = {
  body: "We are seeking a rigorous and highly technical professional to lead the design and execution of projects. You will bridge the gap between aesthetic vision and complex technical reality, ensuring facilities meet world-class standards while remaining highly functional for all users.",
  responsibilities: [
    "Lead comprehensive spatial planning and workflow optimization.",
    "Coordinate structural and MEP integration into the design.",
    "Produce hyperrealistic renders for stakeholder presentations.",
    "Supervise site execution from concept to handover.",
  ],
  requirements: [
    "Master's degree in a relevant field with 5+ years' experience.",
    "Advanced proficiency in industry-standard design tools.",
    "Exceptional understanding of building codes and detailing.",
  ],
};

export const SAMPLE_JOBS: SampleJob[] = [
  { id: "s1", title: "Senior Architect", company: "UrbanGrid Studios", location: "Lagos, Nigeria", desc: "Lead spatial planning and technical design for landmark commercial builds.", tags: ["Full-time", "On-site", "Senior"], salary: "₦600k – ₦900k /m", time: "4d ago", applicants: 24, category: "Architecture" },
  { id: "s2", title: "Project Manager", company: "Cubic Studio", location: "Abuja, Nigeria", desc: "Own delivery across budget, schedule and on-site teams for mixed-use projects.", tags: ["Full-time", "Hybrid", "Senior"], salary: "₦450k – ₦700k /m", time: "2d ago", applicants: 41, category: "Project Mgmt" },
  { id: "s3", title: "Structural Engineer", company: "BuildRight Ltd", location: "Port Harcourt", desc: "Design and verify structural systems for high-rise residential developments.", tags: ["Full-time", "On-site", "Intermediate"], salary: "₦400k – ₦650k /m", time: "1d ago", applicants: 18, category: "Engineering" },
  { id: "s4", title: "Quantity Surveyor", company: "CostLine NG", location: "Lagos, Nigeria", desc: "Prepare BOQs, manage costs and run tenders for active construction sites.", tags: ["Contract", "On-site", "Intermediate"], salary: "₦350k – ₦550k /m", time: "6h ago", applicants: 9, category: "Surveying" },
  { id: "s5", title: "BIM Specialist", company: "ModelWorks", location: "Remote", desc: "Build coordinated Revit models and run clash detection across disciplines.", tags: ["Full-time", "Remote", "Senior"], salary: "₦700k – ₦1M /m", time: "3d ago", applicants: 33, category: "Design" },
  { id: "s6", title: "Site Engineer", company: "Foundation Co", location: "Enugu, Nigeria", desc: "Supervise day-to-day works, QA and subcontractor coordination on site.", tags: ["Full-time", "On-site", "Entry"], salary: "₦250k – ₦400k /m", time: "5d ago", applicants: 52, category: "Engineering" },
  { id: "s7", title: "Interior Designer", company: "Atelier Nine", location: "Lagos, Nigeria", desc: "Concept-to-handover interior packages for premium residential clients.", tags: ["Part-time", "Hybrid", "Intermediate"], salary: "₦300k – ₦500k /m", time: "1w ago", applicants: 27, category: "Design" },
  { id: "s8", title: "MEP Engineer", company: "FlowSystems", location: "Abuja, Nigeria", desc: "Design mechanical, electrical and plumbing systems for commercial towers.", tags: ["Full-time", "On-site", "Senior"], salary: "₦500k – ₦800k /m", time: "2d ago", applicants: 15, category: "Engineering" },
  { id: "s9", title: "Landscape Architect", company: "GreenScape", location: "Ibadan, Nigeria", desc: "Design public realm and estate landscaping with sustainable materials.", tags: ["Contract", "Hybrid", "Intermediate"], salary: "₦350k – ₦600k /m", time: "4d ago", applicants: 12, category: "Architecture" },
  { id: "s10", title: "Construction Manager", company: "Apex Builders", location: "Lagos, Nigeria", desc: "Run multiple sites, manage P&L, safety and programme across the portfolio.", tags: ["Full-time", "On-site", "Director"], salary: "₦900k – ₦1.4M /m", time: "3d ago", applicants: 8, category: "Construction" },
  { id: "s11", title: "Draughtsperson", company: "LineWork NG", location: "Remote", desc: "Produce detailed construction drawings from architect concepts in AutoCAD.", tags: ["Full-time", "Remote", "Entry"], salary: "₦200k – ₦320k /m", time: "8h ago", applicants: 61, category: "Design" },
  { id: "s12", title: "Land Surveyor", company: "GeoPoint", location: "Kano, Nigeria", desc: "Carry out topographic and boundary surveys for new development sites.", tags: ["Contract", "On-site", "Intermediate"], salary: "₦300k – ₦480k /m", time: "5d ago", applicants: 14, category: "Surveying" },
  { id: "s13", title: "Estimator", company: "BidWise", location: "Lagos, Nigeria", desc: "Build accurate cost estimates and support competitive tender submissions.", tags: ["Full-time", "Hybrid", "Senior"], salary: "₦450k – ₦700k /m", time: "2d ago", applicants: 19, category: "Surveying" },
  { id: "s14", title: "Civil Engineer", company: "TerraForm", location: "Abuja, Nigeria", desc: "Lead roads, drainage and earthworks design for infrastructure projects.", tags: ["Full-time", "On-site", "Senior"], salary: "₦550k – ₦850k /m", time: "6d ago", applicants: 23, category: "Engineering" },
  { id: "s15", title: "Health & Safety Officer", company: "SafeSite", location: "Port Harcourt", desc: "Implement HSE policy, run inductions and audits across active sites.", tags: ["Full-time", "On-site", "Intermediate"], salary: "₦320k – ₦520k /m", time: "1w ago", applicants: 30, category: "Construction" },
  { id: "s16", title: "Architectural Visualiser", company: "RenderHaus", location: "Remote", desc: "Create photoreal renders and walkthroughs for client presentations.", tags: ["Contract", "Remote", "Intermediate"], salary: "₦400k – ₦700k /m", time: "3d ago", applicants: 44, category: "Design" },
  { id: "s17", title: "Planning Engineer", company: "Critical Path", location: "Lagos, Nigeria", desc: "Develop and maintain project programmes in Primavera P6 and MS Project.", tags: ["Full-time", "Hybrid", "Senior"], salary: "₦500k – ₦780k /m", time: "4d ago", applicants: 11, category: "Project Mgmt" },
  { id: "s18", title: "Clerk of Works", company: "QualityFirst", location: "Enugu, Nigeria", desc: "Independent on-site quality inspection and reporting against specification.", tags: ["Contract", "On-site", "Senior"], salary: "₦380k – ₦600k /m", time: "5d ago", applicants: 7, category: "Construction" },
];

export const getSampleJob = (id: string) => SAMPLE_JOBS.find((j) => j.id === id) ?? null;
