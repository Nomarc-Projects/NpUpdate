import { bodyStep, centerStep, type TourDef } from "./types";

/**
 * Page tours — one per major dashboard route, referenced by route-match.ts.
 *
 * Each covers what is *actually* on the page and what the user can do there.
 * Shared pages (profile, messages, people, settings…) serve every role via a
 * multi-audience array; role-specific pages narrow their audience so "Tour
 * this page" shows the right content for whoever is looking.
 *
 * Targets are `data-tour` anchors on the real components. Where no anchor
 * exists yet the step falls back to a center step (still informative, never
 * stalls) — anchors get added incrementally.
 */

const ALL = ["client", "professional", "exhibitor", "employer"] as const;
const PROFESSIONAL = "professional" as const;
const EXHIBITOR = "exhibitor" as const;
const EMPLOYER = "employer" as const;

/* ── Shared pages ─────────────────────────────────────────────────────── */

const profilePage: TourDef = {
  id: "profile-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/profile",
  steps: [
    centerStep({ key: "profile-intro", icon: "badgeCheck", showEstimate: true, title: "Your profile", content: "This is what clients, employers and exhibitors see when they find you. A complete profile also clears Verification Tier 1." }),
    bodyStep("profile-identity", { key: "profile-identity", icon: "users", title: "Your identity card", content: "Name, headline, location and availability. Your headline is the first thing people read — make it count." }),
    bodyStep("profile-skills", { key: "profile-skills", icon: "badgeCheck", title: "Skills & specializations", content: "List what you do and the fields you work across. Endorsements from other members build trust here." }),
    bodyStep("profile-verification", { key: "profile-verification", icon: "shieldCheck", title: "Verification", content: "Tier 1 clears once your profile basics are in place. Tier 2 needs documents and is how you earn the verified seal." }),
  ],
};

const messagesPage: TourDef = {
  id: "messages-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/messages",
  steps: [
    centerStep({ key: "messages-intro", icon: "message", showEstimate: true, title: "Messages", content: "Every conversation with clients, employers and exhibitors, in one place." }),
    bodyStep("messages-inbox", { key: "messages-inbox", icon: "inbox", title: "Your inbox", content: "Conversations are grouped by who you're talking to. Unread threads sit at the top." }),
    bodyStep("messages-composer", { key: "messages-composer", icon: "send", title: "Start a conversation", content: "Message anyone you've connected with — from a listing, a profile, or the people directory." }),
  ],
};

const peoplePage: TourDef = {
  id: "people-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/people",
  steps: [
    centerStep({ key: "people-intro", icon: "users", showEstimate: true, title: "The Directory", content: "Every professional and company on the platform, searchable and filterable." }),
    bodyStep("people-search", { key: "people-search", icon: "search", title: "Search & filter", content: "Filter by trade, industry, verification tier and location to find exactly who you need." }),
    bodyStep("people-save", { key: "people-save", icon: "pin", title: "Save leads", content: "Save interesting profiles into lists so you can come back and reach out later." }),
  ],
};

const companiesPage: TourDef = {
  id: "companies-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/companies",
  steps: [
    centerStep({ key: "companies-intro", icon: "building", showEstimate: true, title: "Companies", content: "Browse registered companies, their verified status, and the products they list." }),
    bodyStep("companies-list", { key: "companies-list", icon: "boxes", title: "The roster", content: "Every exhibitor company on the platform. Verified companies carry a seal." }),
  ],
};

const listsPage: TourDef = {
  id: "lists-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/lists",
  steps: [
    centerStep({ key: "lists-intro", icon: "folder", showEstimate: true, title: "Your lists", content: "Curated shortlists of people, companies and products you save as you browse." }),
    bodyStep("lists-new", { key: "lists-new", icon: "plus", title: "Create a list", content: "Start a list for a project, a hire, or a material shortlist — whatever you're tracking." }),
  ],
};

const settingsPage: TourDef = {
  id: "settings-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/settings",
  steps: [
    centerStep({ key: "settings-intro", icon: "settings", showEstimate: true, title: "Account settings", content: "Where every profile you hold, plus verification, billing and notifications, live." }),
    bodyStep("settings-profiles", { key: "settings-profiles", icon: "users", title: "Your profiles", content: "Each role you've unlocked has its own profile here — switch or manage them independently." }),
    bodyStep("settings-account", { key: "settings-account", icon: "users", title: "Account", content: "Email, password and security. Changing your password signs out everywhere else." }),
  ],
};

const notificationsPage: TourDef = {
  id: "notifications-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/notifications",
  steps: [
    centerStep({ key: "notif-intro", icon: "bell", showEstimate: true, title: "Notifications", content: "Everything that needs your attention — applications, quote requests, messages and platform updates." }),
    bodyStep("notif-list", { key: "notif-list", icon: "bell", title: "Your feed", content: "Each notification links straight to what it's about. Read ones sink out of the way." }),
  ],
};

const supportPage: TourDef = {
  id: "support-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/support",
  steps: [
    centerStep({ key: "support-intro", icon: "lifeBuoy", showEstimate: true, title: "Support", content: "Get help from the Nomarc team — raise a ticket and track it here." }),
    bodyStep("support-new", { key: "support-new", icon: "message", title: "Open a ticket", content: "Describe the issue and a human picks it up. Your open tickets and their replies live below." }),
  ],
};

const plansPage: TourDef = {
  id: "plans-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/plans",
  steps: [
    centerStep({ key: "plans-intro", icon: "creditCard", showEstimate: true, title: "Plans", content: "Free, Plus, Pro and Premium — each unlocks more reach, more listings and more Nomabot allowance." }),
    bodyStep("plans-compare", { key: "plans-compare", icon: "barChart", title: "Compare", content: "See what each tier includes for professionals and exhibitors before you upgrade." }),
  ],
};

const billingPage: TourDef = {
  id: "billing-page",
  audience: [...ALL],
  kind: "page",
  route: "/dashboard/billing",
  steps: [
    centerStep({ key: "billing-intro", icon: "receipt", showEstimate: true, title: "Billing", content: "Your current plan, renewals, and every payment receipt in one place." }),
    bodyStep("billing-history", { key: "billing-history", icon: "receipt", title: "Payment history", content: "Every transaction and its status. Receipts are downloadable and printable." }),
  ],
};

/* ── Professional pages ───────────────────────────────────────────────── */

const jobsPage: TourDef = {
  id: "jobs-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/jobs",
  steps: [
    centerStep({ key: "jobs-intro", icon: "briefcase", showEstimate: true, title: "Find work", content: "Every open role from employers, filterable the way you work." }),
    bodyStep("jobs-filters", { key: "jobs-filters", icon: "filter", title: "Narrow it down", content: "Filter by trade, location, salary and work model. Save a search to run it again in one tap." }),
    bodyStep("jobs-apply", { key: "jobs-apply", icon: "send", title: "Apply", content: "Open a role to see the full brief, then apply with your Nomarc profile or an external link." }),
  ],
};

const applicationsPage: TourDef = {
  id: "applications-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/applications",
  steps: [
    centerStep({ key: "apps-intro", icon: "fileText", showEstimate: true, title: "Your applications", content: "Every role you've applied for, with live status." }),
    bodyStep("apps-status", { key: "apps-status", icon: "clock", title: "Status at a glance", content: "Submitted, shortlisted, hired, rejected — no guessing where you stand." }),
    bodyStep("apps-drafts", { key: "apps-drafts", icon: "penSquare", title: "Drafts", content: "Started an application and didn't finish? It's saved here, ready to continue." }),
  ],
};

const servicesPage: TourDef = {
  id: "services-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/services",
  steps: [
    centerStep({ key: "services-intro", icon: "package", showEstimate: true, title: "Your services", content: "Package what you offer into fixed-scope services buyers can hire directly." }),
    bodyStep("services-tiers", { key: "services-tiers", icon: "boxes", title: "Basic, Standard, Premium", content: "Each service can carry up to three tiers — price and delivery time per tier." }),
  ],
};

const practiceTemplatesPage: TourDef = {
  id: "practice-templates-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/practice-templates",
  steps: [
    centerStep({ key: "templates-intro", icon: "fileStack", showEstimate: true, title: "Practice templates", content: "Ready-made documents for running a construction practice — BOQs, contracts, letters." }),
    bodyStep("templates-browse", { key: "templates-browse", icon: "search", title: "Browse & download", content: "Find a template, preview it, and download it as a document to adapt." }),
  ],
};

const digitalSealPage: TourDef = {
  id: "digital-seal-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/digital-seal",
  steps: [
    centerStep({ key: "seal-intro", icon: "shieldCheck", showEstimate: true, title: "Digital seal", content: "Your verified professional seal — a tamper-evident mark for documents you issue." }),
    bodyStep("seal-generate", { key: "seal-generate", icon: "check", title: "Generate a seal", content: "Create a seal for a document; anyone can verify it against your profile." }),
  ],
};

const buildingPermitPage: TourDef = {
  id: "building-permit-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/building-permit",
  steps: [
    centerStep({ key: "permit-intro", icon: "building", showEstimate: true, title: "Building permits", content: "Track permit applications and stay on top of Lagos requirements like the LASPPPA amnesty." }),
    bodyStep("permit-apply", { key: "permit-apply", icon: "plus", title: "Start an application", content: "Log a new permit application and keep its documents and dates in one place." }),
  ],
};

const bimToolsPage: TourDef = {
  id: "bim-tools-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/bim-tools",
  steps: [
    centerStep({ key: "bim-intro", icon: "kanban", showEstimate: true, title: "BIM tools", content: "The digital construction toolkit — models, coordination and clash-free handovers." }),
    bodyStep("bim-tools", { key: "bim-tools", icon: "boxes", title: "The toolkit", content: "Each tool covers a stage of the BIM workflow. Pick the one for the job in front of you." }),
  ],
};

const industryReportPage: TourDef = {
  id: "industry-report-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/industry-report",
  steps: [
    centerStep({ key: "report-intro", icon: "barChart", showEstimate: true, title: "Industry report", content: "The pulse of Nigeria's construction market — rates, trends and data for your practice." }),
    bodyStep("report-read", { key: "report-read", icon: "fileText", title: "Read & download", content: "The latest report, plus the archive. Download a copy for your records." }),
  ],
};

const verifiedProsPage: TourDef = {
  id: "verified-pros-page",
  audience: PROFESSIONAL,
  kind: "page",
  route: "/dashboard/verified-pros",
  steps: [
    centerStep({ key: "verified-intro", icon: "badgeCheck", showEstimate: true, title: "Verified professionals", content: "The platform's verified talent — the directory's most trusted tier." }),
    bodyStep("verified-list", { key: "verified-list", icon: "users", title: "Browse the list", content: "Every member who has cleared Tier 2 verification. Filter and reach out directly." }),
  ],
};

/* ── Exhibitor pages ──────────────────────────────────────────────────── */

const myProductsPage: TourDef = {
  id: "my-products-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/my-products",
  steps: [
    centerStep({ key: "products-intro", icon: "boxes", showEstimate: true, title: "Your catalog", content: "Everything you sell, in one place — live listings, drafts and specs." }),
    bodyStep("products-add", { key: "products-add", icon: "plus", title: "Add a product", content: "List a new item with photos, specs and pricing. Drafts stay hidden until you publish." }),
    bodyStep("products-specs", { key: "products-specs", icon: "penSquare", title: "Specs & variants", content: "Each product carries technical specs and size/price variants, so buyers know exactly what they're getting." }),
  ],
};

const quotesPage: TourDef = {
  id: "quotes-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/quotes",
  steps: [
    centerStep({ key: "quotes-intro", icon: "quote", showEstimate: true, title: "Quote requests", content: "Buyers ask about your products here — the queue your dashboard counts." }),
    bodyStep("quotes-respond", { key: "quotes-respond", icon: "send", title: "Respond", content: "Open a request, see exactly what the buyer asked, and send a quote or a message." }),
  ],
};

const ordersPage: TourDef = {
  id: "orders-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/orders",
  steps: [
    centerStep({ key: "orders-intro", icon: "shoppingBag", showEstimate: true, title: "Orders", content: "Every order placed from your catalog, from new to fulfilled." }),
    bodyStep("orders-fulfil", { key: "orders-fulfil", icon: "check", title: "Fulfil", content: "Update status as you pack and ship — buyers see each change." }),
  ],
};

const customersPage: TourDef = {
  id: "customers-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/customers",
  steps: [
    centerStep({ key: "customers-intro", icon: "users", showEstimate: true, title: "Your customers", content: "Everyone who has ordered from you or asked for a quote." }),
    bodyStep("customers-list", { key: "customers-list", icon: "users", title: "The roster", content: "Reach out, re-engage, or just keep your buyer relationships in one place." }),
  ],
};

const walletPage: TourDef = {
  id: "wallet-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/wallet",
  steps: [
    centerStep({ key: "wallet-intro", icon: "wallet", showEstimate: true, title: "Your wallet", content: "Payments received, held in escrow and commissions, plus payouts to your bank." }),
    bodyStep("wallet-balance", { key: "wallet-balance", icon: "wallet", title: "Balance", content: "Available vs held — escrow releases when an order completes." }),
    bodyStep("wallet-payout", { key: "wallet-payout", icon: "send", title: "Withdraw", content: "Send available funds to your bank account. Add payout accounts in settings." }),
  ],
};

const companyPage: TourDef = {
  id: "company-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/company",
  steps: [
    centerStep({ key: "company-intro", icon: "store", showEstimate: true, title: "Your storefront", content: "The public face of your company — what buyers see when they find you." }),
    bodyStep("company-details", { key: "company-details", icon: "building", title: "Company details", content: "Industry, size, headquarters and your about. Keep it current — it's on your public page." }),
    bodyStep("company-verify", { key: "company-verify", icon: "shieldCheck", title: "Verification", content: "Documents here clear your company for Tier 2 and unlock the verified seal." }),
  ],
};

const addProductPage: TourDef = {
  id: "add-product-page",
  audience: EXHIBITOR,
  kind: "page",
  route: "/dashboard/add-product",
  steps: [
    centerStep({ key: "addp-intro", icon: "plus", showEstimate: true, title: "Add a product", content: "List a new item for your catalog — photos, specs, pricing and variants." }),
    bodyStep("addp-form", { key: "addp-form", icon: "penSquare", title: "The form", content: "Name, category, description and technical specs. The more detail, the easier buyers find you." }),
    bodyStep("addp-publish", { key: "addp-publish", icon: "send", title: "Publish", content: "Save as a draft or publish live. Verification status may gate some listings." }),
  ],
};

/* ── Employer pages ───────────────────────────────────────────────────── */

const postJobPage: TourDef = {
  id: "post-job-page",
  audience: EMPLOYER,
  kind: "page",
  route: "/dashboard/jobs/post",
  steps: [
    centerStep({ key: "postjob-intro", icon: "briefcase", showEstimate: true, title: "Post a job", content: "Role basics, compensation, description and how candidates apply." }),
    bodyStep("postjob-form", { key: "postjob-form", icon: "penSquare", title: "The brief", content: "Title, discipline, location and work model. Clear titles get better applicants." }),
    bodyStep("postjob-apply", { key: "postjob-apply", icon: "send", title: "How they apply", content: "Nomarc form, an external link, or email — you pick the funnel." }),
  ],
};

const postedJobsPage: TourDef = {
  id: "posted-jobs-page",
  audience: EMPLOYER,
  kind: "page",
  route: "/dashboard/jobs/posted",
  steps: [
    centerStep({ key: "posted-intro", icon: "clock", showEstimate: true, title: "Your listings", content: "Active, Drafts and Closed — every role you've posted." }),
    bodyStep("posted-status", { key: "posted-status", icon: "filter", title: "Status per listing", content: "Drafts show exactly what's missing before they can go live." }),
    bodyStep("posted-review", { key: "posted-review", icon: "users", title: "Review applicants", content: "Open a live role to see applications and shortlist candidates." }),
  ],
};

const findProfessionalsPage: TourDef = {
  id: "find-professionals-page",
  audience: EMPLOYER,
  kind: "page",
  route: "/dashboard/find-professionals",
  steps: [
    centerStep({ key: "find-intro", icon: "search", showEstimate: true, title: "Find professionals", content: "Search verified talent directly and reach out — don't wait for applications." }),
    bodyStep("find-search", { key: "find-search", icon: "filter", title: "Search & filter", content: "Filter by trade, location, availability and verification tier." }),
    bodyStep("find-contact", { key: "find-contact", icon: "message", title: "Reach out", content: "Message a professional straight from their profile to discuss a role." }),
  ],
};

export const pageTours: TourDef[] = [
  profilePage, messagesPage, peoplePage, companiesPage, listsPage,
  settingsPage, notificationsPage, supportPage, plansPage, billingPage,
  jobsPage, applicationsPage, servicesPage, practiceTemplatesPage,
  digitalSealPage, buildingPermitPage, bimToolsPage, industryReportPage,
  verifiedProsPage,
  myProductsPage, quotesPage, ordersPage, customersPage, walletPage,
  companyPage, addProductPage,
  postJobPage, postedJobsPage, findProfessionalsPage,
];
