import { PRICING, naira } from "@/lib/entitlements";

/**
 * Helm (public) knowledge base — the curated platform corpus the public site
 * assistant is grounded on.
 *
 * This is deliberately plain, serialisable data rather than MDX or prose files:
 * each entry is already a sensible retrieval chunk, so shipping it to the RAG
 * store on the Helm VM is a `JSON.stringify(GUIDE_KNOWLEDGE)` away. Keep bodies
 * self-contained (a chunk is retrieved alone, without its neighbours) and keep
 * them short enough to embed well — roughly a screen of text each.
 *
 * Professional plan prices are derived from {@link PRICING} so the corpus can
 * never drift from what checkout actually charges.
 */

export type GuideDoc = {
  /** Stable slug — used as the citation `ref`, so don't rename casually. */
  id: string;
  title: string;
  /** Retrieval chunk. Plain prose; markdown lists are fine and render in chat. */
  body: string;
  /** Deep-link the assistant may surface as a `navigate` CTA. */
  href?: string;
  /** True when `href` sits behind the auth middleware (visitors hit /login). */
  requiresAuth?: boolean;
  category: GuideCategory;
  /** Free-text retrieval hints — synonyms and phrasings visitors actually use. */
  tags: string[];
};

export type GuideCategory =
  | "platform"
  | "audience"
  | "getting-started"
  | "pricing"
  | "navigation"
  | "faq";

const plan = (tier: "plus" | "pro" | "premium") => {
  const p = PRICING[tier];
  return `${naira(p.monthly)}/month, ${naira(p.biannual)} billed bi-annually, or ${naira(p.annual)} billed annually`;
};

export const GUIDE_KNOWLEDGE: GuideDoc[] = [
  /* ── What Nomarc is ─────────────────────────────────────────────────── */
  {
    id: "what-is-nomarc",
    title: "What Nomarc Data Gig is",
    category: "platform",
    href: "/",
    tags: ["about", "overview", "what is nomarc", "nomadic architects", "platform"],
    body: `Nomarc Data Gig is a digital marketplace for Nigeria's construction ecosystem, operated by Nomadic Architects. It brings three groups onto one platform: construction professionals looking for work and collaborators, exhibitors selling building materials and products, and buyers or clients sourcing both.

The idea is simple — staffing a build, sourcing materials and finding verified people are all the same problem of trust and discovery, so Nomarc puts them in one place. Professionals build a verified profile and win work; exhibitors list products and sell to a trade audience; buyers hire and purchase without cold-calling strangers.

Nomarc is Nigeria-focused: pricing is in naira, payouts run to Nigerian bank accounts, and the professional categories match how the local industry actually works.`,
  },
  {
    id: "how-nomarc-works",
    title: "How Nomarc works end to end",
    category: "platform",
    tags: ["how it works", "process", "workflow", "getting started"],
    body: `A typical journey on Nomarc:

1. **Create an account** and pick what you are here to do — practise as a professional, or exhibit and sell products.
2. **Build your profile or storefront.** Professionals add qualifications, education and a company page. Exhibitors add a product catalogue with variants and pricing.
3. **Get discovered.** Professionals appear in the directory and can apply to posted jobs. Exhibitor products appear in the shop and can be promoted.
4. **Transact.** Jobs run through applications and hiring; products run through quotes, orders, invoices and fulfilment.
5. **Get paid.** Payments settle to your wallet, with a payout ledger and escrow behind it, and invoices are generated automatically.

Everything above lives inside the dashboard once you are signed in.`,
  },
  {
    id: "verification-and-trust",
    title: "Verification, KYC and trust",
    category: "platform",
    tags: ["verified", "kyc", "trust", "safe", "scam", "credentials", "identity"],
    body: `Nomarc verifies the people and businesses on the platform so buyers are not hiring blind.

- **Professionals** upload qualifications and credentials to their profile; verified professionals carry a badge and surface higher in the directory.
- **Companies** can add credentials to a public company page.
- **KYC** is required before payouts are released, which keeps payment details tied to a real, checked identity.
- **Moderation** covers products and listings, and disputes can be raised on an order.

Verification is a review process, not instant — allow a little time after submitting documents.`,
  },

  /* ── The three audiences ────────────────────────────────────────────── */
  {
    id: "audience-professionals",
    title: "For construction professionals",
    category: "audience",
    tags: ["professional", "architect", "engineer", "quantity surveyor", "project manager", "builder", "contractor", "jobs", "work"],
    body: `Professionals are the core audience: architects, engineers, quantity surveyors, project managers, builders and contractors.

What you get:
- A **verified professional profile** with qualifications, education and portfolio, plus a public company page if you run a practice.
- **The job board** — browse and apply to real posted opportunities, track applications and save drafts.
- **Post jobs yourself.** If you are leading a project and need a team, you can post a job and hire from the network.
- **The professional directory** to find and be found by collaborators.
- **Messaging, saved lists and a network** to keep working relationships in one place.
- On paid plans: project management, practice templates, industry reports and more.

Note that individual artisans (carpenters, masons, electricians) do not register directly — they work through registered contractors who represent them.`,
  },
  {
    id: "audience-exhibitors",
    title: "For exhibitors (material suppliers and brands)",
    category: "audience",
    tags: ["exhibitor", "supplier", "vendor", "seller", "brand", "materials", "products", "sell", "storefront"],
    body: `Exhibitors are material suppliers, manufacturers and brands selling into construction.

What you get:
- A **product catalogue** — add products one at a time with a guided wizard, or bulk-import a CSV. Variants, pricing and stock are supported.
- **A buyer-facing shop listing** where trade buyers browse and buy.
- **Orders and fulfilment** — accept orders, respond to quote requests (RFQs), fulfil, and issue invoices with automatic numbering.
- **A customers CRM** derived from your order history, with a detail view and CSV export.
- **Sales analytics** and, on the top tier, homepage product ads.
- **A multi-account wallet** with a payout ledger for settlement to Nigerian bank accounts.

Exhibitors sell on their own commerce track — they are not gated by the professional plan matrix, they have their own exhibitor tiers.`,
  },
  {
    id: "audience-buyers",
    title: "For buyers and clients",
    category: "audience",
    tags: ["buyer", "client", "hire", "purchase", "procurement", "shop", "rfq", "quote"],
    body: `Buyers and clients come to Nomarc to hire people and source materials without working through a chain of intermediaries.

What you get:
- **Hire professionals** — post a job, receive applications, and review verified profiles before you commit.
- **Shop materials** from exhibitor catalogues, with product detail pages and variants.
- **Request quotes (RFQ)** when you need pricing on a larger or non-standard order, and negotiate in-thread.
- **Orders and invoices** — buy now or accept a quote, track fulfilment, and keep invoices on file.
- **Saved items, lists and addresses** so repeat procurement is quick.
- **Disputes** if an order goes wrong.

Signing up and browsing is free; you only pay for what you buy.`,
  },

  /* ── Getting started ────────────────────────────────────────────────── */
  {
    id: "how-to-sign-up",
    title: "How to sign up",
    category: "getting-started",
    href: "/signup",
    tags: ["sign up", "signup", "register", "create account", "join", "get started", "free"],
    body: `Signing up is free and takes a couple of minutes.

1. Go to the **Sign up** page.
2. Register with an email address and password, or continue with Google.
3. Choose your track — **professional** (you practise, and you can also hire and buy) or **exhibitor** (you sell products).
4. Verify your email, then complete onboarding: profile details for professionals, or company and catalogue details for exhibitors.

You can browse jobs, build a profile and get listed on the free tier — paid plans unlock the heavier tools. If you already have an account, sign in instead.`,
  },
  {
    id: "signing-in",
    title: "Signing in and account access",
    category: "getting-started",
    href: "/login",
    tags: ["login", "log in", "sign in", "password", "forgot password", "reset", "google"],
    body: `Sign in with the email and password you registered with, or with Google if that is how you created the account.

Password reset by email is not live yet — if you are locked out, contact the team through the contact page and they will sort it out manually. This is a temporary gap while email delivery is being finished.

Your role and plan live on your account, so signing in drops you straight into the right dashboard.`,
  },
  {
    id: "account-and-profile",
    title: "Managing your profile, company and settings",
    category: "getting-started",
    href: "/profile",
    requiresAuth: true,
    tags: ["profile", "company", "settings", "account", "qualifications", "education", "edit profile"],
    body: `Your account pages sit outside the dashboard, in the main site chrome:

- **Profile** — your public professional identity, with sub-pages for qualifications and education.
- **Company** — your practice or business page, with a credentials sub-page and its own settings.
- **Settings** — account preferences, including the account-level settings page.

A complete profile is what makes you findable in the directory and credible on applications, so it is worth filling out properly before you start applying for work.`,
  },

  /* ── Pricing ────────────────────────────────────────────────────────── */
  {
    id: "pricing-overview",
    title: "Plans and pricing — overview",
    category: "pricing",
    href: "/#plans",
    tags: ["pricing", "plans", "cost", "how much", "subscription", "free", "upgrade", "billing"],
    body: `Nomarc has a free tier plus three paid tiers. There are two separate ladders because professionals and exhibitors buy different things.

**It is free to sign up**, create a profile, browse jobs and get listed. Paid plans unlock the heavier tooling.

Every paid tier bills **monthly, bi-annually or annually** — the longer cycles carry a discount against paying month to month. Prices are in Nigerian naira.

Professional tiers are **Plus, Pro and Premium**. Exhibitor tiers are **Directory, Exhibit and Leader** (mapping to Plus, Pro and Premium access respectively).`,
  },
  {
    id: "pricing-professional",
    title: "Professional plans — Plus, Pro and Premium",
    category: "pricing",
    href: "/#plans",
    tags: ["professional plan", "plus", "pro", "premium", "pricing", "features", "upgrade"],
    body: `**Plus** — ${plan("plus")}. For individuals and light users. Includes project management, business templates, building permit tools, the monthly industry report and the AI consultant.

**Pro** — ${plan("pro")}. For growing teams and active networkers. Everything in Plus, plus verified professionals access and competitions.

**Premium** — ${plan("premium")}. For established firms maximising reach. Everything in Pro, plus the full professional directory, competitions and tenders, BIM tools and the digital seal.

The free tier still covers signing up, a profile, browsing jobs and applying — you are not blocked from the core marketplace by not paying.`,
  },
  {
    id: "pricing-exhibitor",
    title: "Exhibitor plans — Directory, Exhibit and Leader",
    category: "pricing",
    href: "/#plans",
    tags: ["exhibitor plan", "directory", "exhibit", "leader", "pricing", "product upload", "seller pricing"],
    body: `Exhibitor tiers are priced on how much you sell, and the main lever is how many products you may list.

**Directory** (Plus access) — ₦60,000/month, ₦342,000 bi-annually, or ₦648,000 annually. 1 product upload.

**Exhibit** (Pro access) — ₦205,000/month, ₦1,168,500 bi-annually, or ₦2,214,000 annually. 5 product uploads plus data insight.

**Leader** (Premium access) — ₦500,000/month, ₦2,850,000 bi-annually, or ₦5,400,000 annually. 10+ product uploads, homepage product ads and data insight.

Premium exhibitor placement is handled as a conversation rather than pure self-serve — reach out through the contact page to discuss a Leader plan.`,
  },
  {
    id: "payments-and-payouts",
    title: "Payments, wallet and payouts",
    category: "pricing",
    tags: ["payment", "paystack", "payout", "wallet", "escrow", "invoice", "bank account", "settlement"],
    body: `Payments run through Paystack in a multivendor setup — each exhibitor has a subaccount and each transaction is split automatically, so sellers are paid directly rather than waiting on manual disbursement.

- **Wallet** — connect up to three bank accounts for settlement. Account names are re-resolved against the bank, and a mismatch raises a warning before anything is paid out.
- **Payout ledger and escrow** back every movement, so there is an auditable trail.
- **Invoices** are generated automatically with sequential numbering.
- **KYC** must be complete before payouts are released.

Live card payments are still being switched on — the platform currently runs in a demo mode for checkout while the payment keys and KYC are finalised.`,
  },

  /* ── Navigation / deep links ────────────────────────────────────────── */
  {
    id: "key-pages",
    title: "Key pages and where to find things",
    category: "navigation",
    tags: ["navigation", "pages", "links", "where", "find", "menu", "sitemap"],
    body: `Public pages anyone can visit:
- **Home** (/) — the overview, plans and FAQ.
- **About** (/about) — Nomarc and Nomadic Architects.
- **Tools** (/tools) — every tool on the platform, grouped by what it is for.
- **News Feed** (/newsfeed) — industry writing and platform updates.
- **Contact** (/contact) — reach the team.
- **Sign up** (/signup) and **Log in** (/login).
- **Privacy** (/privacy) and **Terms** (/terms).

Once signed in, everything else lives under the dashboard — jobs, the directory, products, orders, quotes, messaging, wallet and billing. Visiting a dashboard link while signed out sends you to the login page and returns you there afterwards.`,
    href: "/tools",
  },
  {
    id: "page-tools",
    title: "The Tools page",
    category: "navigation",
    href: "/tools",
    tags: ["tools", "features", "capabilities", "what can i do"],
    body: `The Tools page is the fastest way to see everything Nomarc offers, grouped into three areas:

- **Career growth** — the job board, hiring professionals from the verified directory, and the AI assistant for smarter applications and shortlists.
- **Network** — the industry newsfeed, the exhibition hub for sourcing materials directly from suppliers, and property listings.
- **Project management** — tasks, milestones and team coordination, plus practice templates covering contracts, BOQs, programmes and reports.

Each tool is tagged by who it is for, and anything not yet live is marked as coming soon.`,
  },
  {
    id: "page-newsfeed",
    title: "The News Feed",
    category: "navigation",
    href: "/newsfeed",
    tags: ["newsfeed", "articles", "news", "insights", "updates", "read"],
    body: `The Nomarc news feed covers Nigerian construction industry topics and platform updates. Articles are free to read; some content prompts you to sign in.

If you are trying to understand the market before committing to a plan, the news feed is a reasonable place to start.`,
  },
  {
    id: "page-contact",
    title: "Contacting the team",
    category: "navigation",
    href: "/contact",
    tags: ["contact", "support", "help", "email", "phone", "talk to someone", "sales"],
    body: `Use the contact page to reach the Nomarc team — for sales questions, partnership or exhibitor enquiries, account problems, or anything the Guide cannot answer.

Signed-in users also have an in-dashboard support section for account and order issues, which is the better route for anything tied to a specific order or payout.`,
  },

  /* ── FAQs ───────────────────────────────────────────────────────────── */
  {
    id: "faq-who-can-use",
    title: "FAQ — Who can use Nomarc?",
    category: "faq",
    tags: ["who can join", "eligibility", "artisan", "contractor", "qualify"],
    body: `Nomarc is built for professionals in the built environment: architects, engineers, interior designers, quantity surveyors, project managers, and contractors who can provide teams of skilled workers such as masons, painters and carpenters. Material suppliers and brands join as exhibitors, and clients join to hire and buy.

**Individual artisans cannot register directly** at this stage — a carpenter or electrician gets work through a registered contractor who manages and represents them on the platform.`,
  },
  {
    id: "faq-is-it-free",
    title: "FAQ — Is it free to join?",
    category: "faq",
    href: "/signup",
    tags: ["free", "cost", "price", "trial", "pay"],
    body: `Yes. Signing up, creating a profile and browsing available jobs are free. Paid plans exist for the heavier tooling — project management, templates, industry reports, BIM tools, the full directory — but you are not required to pay to participate in the core marketplace.

Exhibitors are the exception: listing products for sale sits on an exhibitor plan, because that is a commercial storefront rather than a profile.`,
  },
  {
    id: "faq-post-a-job",
    title: "FAQ — Can a professional post a job?",
    category: "faq",
    tags: ["post job", "hire", "recruit", "staffing", "find team", "vacancy"],
    body: `Yes. If you are a professional leading a project and you need a team — contractors, designers, engineers — you can post a job and hire from the verified network. Posting runs through a guided wizard, and you manage applications from your dashboard.

You do not need to be a client or a company to post; professionals hire other professionals on Nomarc all the time.`,
  },
  {
    id: "faq-how-do-i-get-hired",
    title: "FAQ — How do I actually get work?",
    category: "faq",
    tags: ["get hired", "find work", "apply", "job board", "applications", "win work"],
    body: `Two routes, and the strongest users do both:

1. **Apply.** Browse the job board, apply to posted roles, and track your applications from the dashboard. You can save drafts and come back to them.
2. **Get found.** A complete, verified profile puts you in the professional directory where clients and other professionals search for people to bring onto a build.

Profiles with qualifications uploaded and verification complete get materially more attention than empty ones — fill yours out before you start applying.`,
  },
  {
    id: "faq-ai-features",
    title: "FAQ — What about the AI features?",
    category: "faq",
    tags: ["ai", "assistant", "consultant", "guide", "chatbot", "coming soon"],
    body: `Nomarc is rolling AI out in stages.

**Helm** — this assistant — is live on the public site. It answers questions about the platform, the plans and how things work, and can point you to the right page. It has no memory between visits: close the tab and the conversation is gone.

**The AI consultant** for professionals and the AI assistant for applications and shortlisting are on paid plans and are being built out. Where you see them marked "coming soon" in the product, that is accurate rather than a placeholder.

The Guide can be wrong. For anything contractual, financial or account-specific, check with the team through the contact page.`,
  },
  {
    id: "faq-data-and-privacy",
    title: "FAQ — What happens to my data?",
    category: "faq",
    href: "/privacy",
    tags: ["privacy", "data", "gdpr", "security", "terms", "delete account"],
    body: `The privacy policy sets out what Nomarc collects and how it is used, and the terms cover the rules of using the platform. Both are linked in the site footer and worth reading before you upload credentials or KYC documents.

Conversations with this Guide are not stored against your account — history is held in the browser tab for the length of the conversation and is not persisted.`,
  },
];

/** Lookup by id — handy for resolving a citation `ref` back to its document. */
export const GUIDE_KNOWLEDGE_BY_ID: Record<string, GuideDoc> = Object.fromEntries(
  GUIDE_KNOWLEDGE.map((doc) => [doc.id, doc]),
);

/** Every deep-link the Guide is allowed to suggest, for validating `navigate`. */
export const GUIDE_LINKABLE_HREFS: string[] = Array.from(
  new Set(GUIDE_KNOWLEDGE.flatMap((doc) => (doc.href ? [doc.href] : []))),
);
