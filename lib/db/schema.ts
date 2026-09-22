import { pgTable, uuid, text, integer, bigint, boolean, timestamp, date, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Nomarc app schema (Drizzle) on CockroachDB. Better Auth manages
 * user/session/account/verification separately; here `userId` columns are TEXT
 * referencing that auth `user.id` (FKs added in the migration apply step).
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const upd = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/* ── Professional profile ──────────────────────────────────────────────── */
export const profile = pgTable("profile", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  headline: text("headline"),
  bio: text("bio"),
  location: text("location"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  availability: text("availability"), // open_to_work | hiring | none
  /** Professional practice / licensing status shown under Qualification on the
   *  find-work onboarding — registered | in_progress | not_licensed.
   *  Distinct from `practiceStatus`, which drives the practice-profile page. */
  practiceLicenceStatus: text("practice_licence_status"),
  /** intern | graduate | consultant | licensed | registered | company — drives the
   *  conditional fields below. Null on profiles predating 0033. */
  practiceStatus: text("practice_status"),
  /** Set only when practiceStatus = "licensed". */
  licenseNumber: text("license_number"),
  /** Professional registration number (collect on onboarding Registered status). */
  registrationNumber: text("registration_number"),
  /** Set only when practiceStatus = "company". Distinct from the `company`
   *  table, which is the exhibitor storefront — see drizzle/0033. */
  practiceCompanyName: text("practice_company_name"),
  practiceRegNumber: text("practice_reg_number"),
  practiceCompanyAddress: text("practice_company_address"),
  practiceCompanyBio: text("practice_company_bio"),
  /** "professional" | "non_professional" — the kind picked in the "Set up as a
   *  company" flow (drizzle/0049). Null on older profiles; new setups default
   *  to "professional". */
  companyKind: text("company_kind"),
  avatarUrl: text("avatar_url"),
  rate: text("rate"),
  // Canonical discipline for Helm's persona + retrieval filter. Same vocabulary
  // as bt_template.discipline. Null = infer from `headline` (free-text occupation).
  discipline: text("discipline"),
  yearsExperience: integer("years_experience"),
  successScore: integer("success_score").default(0),
  completeness: integer("completeness").default(0),
  verified: boolean("verified").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

export const workExperience = pgTable("work_experience", {
  id: id(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description"),
  location: text("location"),
  workplaceType: text("workplace_type"), // remote | hybrid | onsite
  startDate: date("start_date"),
  endDate: date("end_date"),
  current: boolean("current").default(false),
  /** Photo of the work / project the role delivered. */
  workPhoto: text("work_photo"),
  createdAt: ts(),
});

export const education = pgTable("education", {
  id: id(),
  userId: text("user_id").notNull(),
  school: text("school").notNull(),
  degree: text("degree"),
  field: text("field"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  current: boolean("current").default(false).notNull(),
  description: text("description"),
  /** Degree, transcript or certificate backing this entry. */
  proofUrl: text("proof_url"),
  /** null = nothing submitted; otherwise pending | approved | rejected,
   *  matching kyc_document's vocabulary. */
  proofStatus: text("proof_status"),
  proofSubmittedAt: timestamp("proof_submitted_at", { withTimezone: true }),
  createdAt: ts(),
});

export const skill = pgTable("skill", {
  id: id(),
  name: text("name").notNull().unique(),
  category: text("category"),
});

export const profileSkill = pgTable("profile_skill", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").default("skill"), // skill | specialization
  endorsements: integer("endorsements").default(0),
  createdAt: ts(),
});

export const certification = pgTable("certification", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  issuer: text("issuer"),
  year: integer("year"),
  url: text("url"),
  verified: boolean("verified").default(false),
  createdAt: ts(),
});

/** Professional/regulatory body registrations (e.g. ARCON, COREN) + reg number. */
export const professionalRegistration = pgTable("professional_registration", {
  id: id(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),               // taxonomy regulatory_body term
  registrationNumber: text("registration_number"),
  createdAt: ts(),
});

/** Referees attached to a professional's profile. */
export const reference = pgTable("reference", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  contactType: text("contact_type").default("email"), // email | phone
  contact: text("contact"),
  organization: text("organization"),
  createdAt: ts(),
});

export const project = pgTable("project", {
  id: id(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  role: text("role"),
  description: text("description"),
  location: text("location"),
  coverUrl: text("cover_url"),
  gallery: text("gallery").array(),
  draft: boolean("draft").default(false),
  // Added by drizzle/0041: the Add-New-Project form has always collected these
  // but had nowhere to put them.
  startDate: date("start_date"),
  endDate: date("end_date"),
  ongoing: boolean("ongoing").default(false).notNull(),
  responsibilities: text("responsibilities").array(),
  createdAt: ts(),
});

/* ── Exhibitor company + catalog ───────────────────────────────────────── */
export const company = pgTable("company", {
  id: id(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  about: text("about"),
  industry: text("industry"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  contactPerson: text("contact_person"),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false),
  headquarters: text("headquarters"),
  yearFounded: integer("year_founded"),
  companySize: text("company_size"),
  companyType: text("company_type"),
  /** Owner-editable CAC/registration number. The KYC document remains the
   *  verification artefact — see drizzle/0035. */
  registrationNumber: text("registration_number"),
  categories: text("categories").array(),
  avatarUrl: text("avatar_url"),
  verified: boolean("verified").default(false),
  completeness: integer("completeness").default(0),
  /** Anchor for the exhibitor's 30-day, one-free-listing trial. */
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  createdAt: ts(),
  updatedAt: upd(),
});

export const product = pgTable("product", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug"),
  sku: text("sku"),
  category: text("category"),
  type: text("type"),
  vendorName: text("vendor_name"),
  description: text("description"),
  materialGrade: text("material_grade"),
  variations: text("variations"),
  availability: text("availability"), // in_stock | made_to_order | rentable
  tags: text("tags").array(),
  coverUrl: text("cover_url"),
  gallery: text("gallery").array(),
  specs: jsonb("specs").$type<{ label: string; value: string }[]>(),
  retailMin: integer("retail_min"),
  retailMax: integer("retail_max"),
  wholesaleMin: integer("wholesale_min"),
  wholesaleMax: integer("wholesale_max"),
  costPerItem: integer("cost_per_item"),
  stock: integer("stock").default(0),
  unit: text("unit"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: text("status").default("active"), // active | draft | archived
  draft: boolean("draft").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

export const productVariant = pgTable("product_variant", {
  id: id(),
  productId: uuid("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  spec: text("spec"),
  price: integer("price"),
  stock: integer("stock").default(0),
  sku: text("sku"),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: ts(),
});

export const companyCertification = pgTable("company_certification", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuer: text("issuer"),
  year: integer("year"),
  url: text("url"),
  createdAt: ts(),
});

/**
 * Employer hiring profile — the employer analogue of `company` (exhibitor).
 * One row per user who holds the `employer` role. `companyId` is nullable and
 * only set when the employer is hiring under an existing exhibitor company
 * they own; otherwise this is a freestanding hiring profile with its own
 * contact phone/email. Not yet written by the onboarding wizard (tracked
 * separately) — the Account Settings Employer accordion is its first writer.
 */
export const employerProfile = pgTable("employer_profile", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  companyId: uuid("company_id").references(() => company.id, { onDelete: "set null" }),
  employerType: text("employer_type"), // general_contracting | staffing_recruiting | multi_disciplinary
  hiringAs: text("hiring_as"), // company | individual
  contactPerson: text("contact_person"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false),
  // Freestanding hiring-profile business identity (Branch B of the employer
  // onboarding wizard — "create a new hiring profile", no existing company).
  // Null when hiringAs = "company" under an existing exhibitor company.
  name: text("name"),
  headquarters: text("headquarters"),
  companySize: text("company_size"),
  yearFounded: integer("year_founded"),
  about: text("about"),
  avatarUrl: text("avatar_url"),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Jobs & hiring ─────────────────────────────────────────────────────── */
export const job = pgTable("job", {
  id: id(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description"),
  location: text("location"),
  employmentType: text("employment_type"),
  workModel: text("work_model"),
  experienceLevel: text("experience_level"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: text("currency").default("NGN"),
  /** Legacy free-text requirements. Kept for rows posted before the repeatable
   *  rows existed; readers fall back to splitting it when the list is empty. */
  requirements: text("requirements"),
  requirementList: text("requirement_list").array(),
  skills: text("skills").array(),
  benefits: text("benefits").array(),
  /** Which fields an applicant must complete. NULL = posted before this existed,
   *  in which case nothing extra is enforced (drizzle/0044). */
  requireResume: boolean("require_resume"),
  requirePortfolio: boolean("require_portfolio"),
  requireCoverLetter: boolean("require_cover_letter"),
  deadline: date("deadline"),
  recruiterName: text("recruiter_name"),
  recruiterTitle: text("recruiter_title"),
  applyMethod: text("apply_method").default("nomarc"), // nomarc | url | email
  applyTarget: text("apply_target"),
  status: text("status").default("open"), // open | closed
  draft: boolean("draft").default(false),
  createdAt: ts(),
});

export const application = pgTable("application", {
  id: id(),
  jobId: uuid("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  applicantUserId: text("applicant_user_id").notNull(),
  coverLetter: text("cover_letter"),
  expectedSalary: text("expected_salary"),
  resumeUrl: text("resume_url"),
  portfolioUrl: text("portfolio_url"),
  linkedinUrl: text("linkedin_url"),
  status: text("status").default("applied"), // applied|shortlisted|interview|offer|hired|rejected|withdrawn
  draft: boolean("draft").default(false),
  createdAt: ts(),
});

/* ── Services (Fiverr-style productized packages) ──────────────────────── */
export const service = pgTable("service", {
  id: id(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category"),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: ts(),
});

export const serviceTier = pgTable("service_tier", {
  id: id(),
  serviceId: uuid("service_id").notNull().references(() => service.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Basic | Standard | Premium
  price: integer("price"),
  deliveryDays: integer("delivery_days"),
  scope: text("scope"),
  sortOrder: integer("sort_order").default(0),
});

export const jobInvitation = pgTable("job_invitation", {
  id: id(),
  jobId: uuid("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  inviterUserId: text("inviter_user_id").notNull(),
  inviteeUserId: text("invitee_user_id").notNull(),
  note: text("note"),
  status: text("status").default("pending"), // pending | accepted | declined
  createdAt: ts(),
});

export const recommendation = pgTable("recommendation", {
  id: id(),
  recommenderUserId: text("recommender_user_id").notNull(),
  recommendeeUserId: text("recommendee_user_id").notNull(),
  relationship: text("relationship"),
  positionAtTime: text("position_at_time"),
  body: text("body").notNull(),
  status: text("status").default("pending"), // pending | approved | hidden
  pinned: boolean("pinned").default(false),
  createdAt: ts(),
});

/* ── Ads Board (self-serve promotions) ───────────────────────────────────
 * Distinct from `advert` (admin-curated marketing content for the public
 * site). This is the redesign's "Ads Board" — a professional or exhibitor
 * creates a promotion of their OWN profile, project, or product, submits it
 * for admin review, and tracks its lifecycle + metrics from their dashboard. */
export const promotion = pgTable("promotion", {
  id: id(),
  ownerUserId: text("owner_user_id").notNull(),
  kind: text("kind").notNull(), // profile | project | product
  refId: uuid("ref_id"), // project.id or product.id; null for profile promotions
  headline: text("headline").notNull(),
  description: text("description"),
  bannerImageUrl: text("banner_image_url"),
  status: text("status").default("pending_review").notNull(), // pending_review | active | paused | rejected | completed
  rejectionReason: text("rejection_reason"),
  views: integer("views").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  /** 7 or 30 — the campaign length bought. Null on pre-payment rows. */
  durationDays: integer("duration_days"),
  /** Naira, matching payment_transaction.amount. */
  amount: integer("amount"),
  /** Survives a rejection so a resubmission reuses the paid slot. */
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  /** Set on approval — the run starts when the ad goes live, not when paid. */
  startedAt: timestamp("started_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Directory "My Searches" (saved/recent searches) ─────────────────────
 * Backs the redesign's People/Companies directory "My searches" control
 * (images 50/56/57): save a named filter set, revisit recent ones. */
export const savedSearch = pgTable("saved_search", {
  id: id(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // people | companies
  name: text("name"), // null = an unsaved "recent" entry, not a named save
  query: jsonb("query").notNull(), // filter/search state, shape owned by the client
  createdAt: ts(),
});

/* ── Commerce (RFQ) ────────────────────────────────────────────────────── */
export const quoteRequest = pgTable("quote_request", {
  id: id(),
  productId: uuid("product_id").references(() => product.id, { onDelete: "set null" }),
  buyerUserId: text("buyer_user_id").notNull(),
  exhibitorUserId: text("exhibitor_user_id"),
  quantity: text("quantity"),
  requiredBy: date("required_by"),
  deliveryLocation: text("delivery_location"),
  message: text("message"),
  status: text("status").default("pending"), // pending|quoted|clarify|declined|accepted
  /** Set when either side clears the thread — drives the "Archived" chip. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  buyerSeenAt: timestamp("buyer_seen_at", { withTimezone: true }),
  exhibitorSeenAt: timestamp("exhibitor_seen_at", { withTimezone: true }),
  createdAt: ts(),
});

/**
 * A priced offer against a quote request. Multiple rows are expected — a buyer
 * asking for changes produces a fresh proposal — so the live one is the newest
 * row that is not withdrawn. See drizzle/0036.
 */
export const quoteProposal = pgTable("quote_proposal", {
  id: id(),
  quoteRequestId: uuid("quote_request_id").notNull().references(() => quoteRequest.id, { onDelete: "cascade" }),
  exhibitorUserId: text("exhibitor_user_id").notNull(),
  quantityQuoted: text("quantity_quoted"),
  /** Kobo, not naira — money never gets a float. */
  totalPrice: bigint("total_price", { mode: "number" }),
  currency: text("currency").default("NGN").notNull(),
  validUntil: date("valid_until"),
  note: text("note"),
  attachments: text("attachments").array(),
  /** sent | withdrawn | accepted | declined | changes_requested */
  status: text("status").default("sent").notNull(),
  buyerNote: text("buyer_note"),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Messaging ─────────────────────────────────────────────────────────── */
export const conversation = pgTable("conversation", {
  id: id(),
  subject: text("subject"),
  kind: text("kind").default("dm"), // dm | rfq
  createdAt: ts(),
  updatedAt: upd(),
});

export const conversationParticipant = pgTable("conversation_participant", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => conversation.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  archived: boolean("archived").default(false),
  muted: boolean("muted").default(false),
});

export const message = pgTable("message", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => conversation.id, { onDelete: "cascade" }),
  senderUserId: text("sender_user_id").notNull(),
  body: text("body").notNull(),
  messageType: text("message_type").default("text").notNull(), // text | image | video | audio | document | contact | poll | event
  attachmentUrl: text("attachment_url"),
  metadata: jsonb("metadata"), // structured payload per type (poll options, event details, contact info, file meta)
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: ts(),
});

/* ── Saved items + lists ───────────────────────────────────────────────── */
export const savedItem = pgTable("saved_item", {
  id: id(),
  userId: text("user_id").notNull(),
  itemType: text("item_type").notNull(), // job | product | professional
  itemId: text("item_id").notNull(),
  createdAt: ts(),
});

// One-way follow (X-style). A↔B mutual follow = a "connection". Powers the
// Follow button, network lists, and first-chat messaging limits.
export const follow = pgTable("follow", {
  id: id(),
  followerId: text("follower_id").notNull(), // who follows
  followeeId: text("followee_id").notNull(), // who is followed
  createdAt: ts(),
});

export const list = pgTable("list", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: ts(),
  updatedAt: upd(),
});

export const listItem = pgTable("list_item", {
  id: id(),
  listId: uuid("list_id").notNull().references(() => list.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // professional | company
  itemId: text("item_id").notNull(),
  createdAt: ts(),
});

/* ── Notifications, verification, moderation ───────────────────────────── */
export const notification = pgTable("notification", {
  id: id(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  read: boolean("read").default(false),
  createdAt: ts(),
});

export const verificationRequest = pgTable("verification_request", {
  id: id(),
  userId: text("user_id").notNull(),
  subjectType: text("subject_type").default("user"), // user | company
  docType: text("doc_type"),
  docUrl: text("doc_url"),
  status: text("status").default("pending"), // pending | approved | rejected
  note: text("note"),
  createdAt: ts(),
});

export const review = pgTable("review", {
  id: id(),
  reviewerUserId: text("reviewer_user_id").notNull(),
  subjectType: text("subject_type").notNull(), // professional | company
  subjectId: text("subject_id").notNull(),     // userId (professional) or companyId
  rating: integer("rating").notNull(),         // 1–5
  comment: text("comment"),
  createdAt: ts(),
});

export const blogPost = pgTable("blog_post", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body"),
  coverUrl: text("cover_url"),
  tags: text("tags").array(),
  author: text("author"),
  readMinutes: integer("read_minutes").default(5),
  status: text("status").default("draft"), // draft | published
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: ts(),
  updatedAt: upd(),
});

export const taxonomyTerm = pgTable("taxonomy_term", {
  id: id(),
  kind: text("kind").notNull(), // occupation | skill | product_category | service_category | industry
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: ts(),
});

export const tickerItem = pgTable("ticker_item", {
  id: id(),
  content: text("content").notNull(),
  href: text("href"),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: ts(),
});

export const announcement = pgTable("announcement", {
  id: id(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  audience: text("audience").default("all"), // all | professional | exhibitor | buyer
  active: boolean("active").default(true),
  createdAt: ts(),
});

/** Ad Board — admin-created promoted listings, shown as a card slider on the site. */
export const advert = pgTable("advert", {
  id: id(),
  heading: text("heading").notNull(),         // card title, e.g. "West Africa's Premier Steel Supplier"
  subheading: text("subheading"),             // legacy (unused by the promoted-card style)
  body: text("body"),                         // supporting copy
  badge: text("badge"),                       // tag pill on the image, e.g. "Promoted"
  promotedName: text("promoted_name"),        // who/what is being promoted, e.g. "Titan SteelCo"
  promotedMeta: text("promoted_meta"),        // role/category · location line
  avatarUrl: text("avatar_url"),              // optional identity photo (else initials)
  ctaLabel: text("cta_label"),                // primary button label, e.g. "View Profile"
  ctaHref: text("cta_href"),                  // primary button link (custom)
  ctaLabel2: text("cta_label_2"),             // secondary button label, e.g. "Message"
  ctaHref2: text("cta_href_2"),               // secondary button link (custom)
  imageUrl: text("image_url"),
  accent: text("accent").default("#ffd716"),  // brand accent for the CTA/badge
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: ts(),
});

export const paymentTransaction = pgTable("payment_transaction", {
  id: id(),
  userId: text("user_id").notNull(),
  plan: text("plan").notNull(),
  cycle: text("cycle").notNull(),
  amount: integer("amount").notNull(), // naira
  currency: text("currency").default("NGN"),
  provider: text("provider").notNull(),
  reference: text("reference").notNull().unique(),
  status: text("status").default("pending"), // pending | success | failed
  kind: text("kind").default("billing"), // billing (subscription plan) | cart (marketplace checkout)
  payload: text("payload"), // JSON cart snapshot (kind='cart') — replayed on settle to create orders
  createdAt: ts(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const webhookEvent = pgTable("webhook_event", {
  id: id(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type"),
  reference: text("reference"),
  rawBody: text("raw_body").notNull(),
  status: text("status").default("processed"), // processed | failed | skipped
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: ts(),
});

export const paymentRetry = pgTable("payment_retry", {
  id: id(),
  reference: text("reference").notNull(),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: ts(),
});

/* ── KYC system ────────────────────────────────────────────────────────── */
export const kycDocument = pgTable("kyc_document", {
  id: id(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),       // professional | exhibitor | buyer
  tier: integer("tier").notNull(),    // 1 | 2 | 3
  docType: text("doc_type").notNull(),
  fileUrl: text("file_url"),
  textValue: text("text_value"),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
});

/**
 * Short-lived phone verification codes (Account Settings "Verify Number" /
 * "Edit Number" flows). One outstanding code per (userId, role) — a new send
 * overwrites the previous row via upsert. No SMS gateway is wired up yet
 * (tracked as a follow-up); `services/phone-verify.ts` "sends" the code by
 * returning/logging it in non-production so the flow is exercisable end to
 * end today.
 */
export const phoneOtp = pgTable(
  "phone_otp",
  {
    id: id(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // professional | exhibitor | employer
    phone: text("phone").notNull(),
    code: text("code").notNull(),
    attempts: integer("attempts").default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: ts(),
  },
  (t) => [uniqueIndex("phone_otp_user_id_role_idx").on(t.userId, t.role)],
);

/**
 * Per-user email notification preferences (Account Settings "Email
 * Notifications" tab). Sparse jsonb keyed by the toggle keys in
 * `lib/constants/notification-prefs.ts` — an absent key falls back to that
 * toggle's documented default, so adding a new toggle never needs a
 * migration. `lib/email/mailer.ts` can consult the same constants file
 * before sending a given notification type.
 */
export const notificationPreference = pgTable("notification_preference", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  prefs: jsonb("prefs").$type<Record<string, boolean>>().default({}),
  createdAt: ts(),
  updatedAt: upd(),
});

export const payoutAccount = pgTable("payout_account", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  bankCode: text("bank_code").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  paystackRecipient: text("paystack_recipient"),
  isVerified: boolean("is_verified").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

export const report = pgTable("report", {
  id: id(),
  reporterUserId: text("reporter_user_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason"),
  status: text("status").default("open"), // open | resolved | dismissed
  createdAt: ts(),
});

export const crmLead = pgTable("crm_lead", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  source: text("source").default("contact_form"), // contact_form | newsletter | manual
  status: text("status").default("new"), // new | contacted | qualified | converted | archived
  notes: text("notes"),
  createdAt: ts(),
});

/* ── Project Management (pm_*) ─────────────────────────────────────────── */
export const pmProject = pgTable("pm_project", {
  id: id(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"), // active | archived | completed
  color: text("color").default("#ffd716"),
  icon: text("icon"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  isTemplate: boolean("is_template").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

export const pmProjectMember = pgTable("pm_project_member", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").default("member"), // owner | admin | member | viewer
  createdAt: ts(),
});

export const pmInvite = pgTable("pm_invite", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  inviterUserId: text("inviter_user_id").notNull(),
  email: text("email").notNull(),
  role: text("role").default("member"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: ts(),
});

export const pmColumn = pgTable("pm_column", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#9a9a9a"),
  sortOrder: text("sort_order").notNull(), // fractional index
  createdAt: ts(),
});

export const pmTask = pgTable("pm_task", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  columnId: uuid("column_id").references(() => pmColumn.id, { onDelete: "set null" }),
  parentTaskId: uuid("parent_task_id"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"), // low | medium | high | urgent
  status: text("status").default("todo"),       // todo | in_progress | blocked | review | done
  sortOrder: text("sort_order").notNull(),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  estimateHours: integer("estimate_hours"),
  actualHours: integer("actual_hours"),
  createdBy: text("created_by").notNull(),
  createdAt: ts(),
  updatedAt: upd(),
});

export const pmTaskAssignee = pgTable("pm_task_assignee", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => pmTask.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: ts(),
});

export const pmTag = pgTable("pm_tag", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#ffd716"),
  createdAt: ts(),
});

export const pmTaskTag = pgTable("pm_task_tag", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => pmTask.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => pmTag.id, { onDelete: "cascade" }),
});

export const pmMilestone = pgTable("pm_milestone", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: ts(),
});

export const pmComment = pgTable("pm_comment", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => pmTask.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull(),
  parentCommentId: uuid("parent_comment_id"),
  body: text("body").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: ts(),
});

export const pmAttachment = pgTable("pm_attachment", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => pmTask.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  mimeType: text("mime_type"),
  createdAt: ts(),
});

export const pmActivity = pgTable("pm_activity", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => pmProject.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => pmTask.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").notNull(),
  type: text("type").notNull(),
  meta: text("meta"),
  createdAt: ts(),
});

/* ── Business Templates (bt_*) ─────────────────────────────────────────── */
export const btTemplate = pgTable("bt_template", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // contract | boq | invoice | report | specification | schedule | other
  discipline: text("discipline"), // architecture | structural | mep | quantity_surveying | project_management | etc.
  fileUrl: text("file_url"),
  previewUrl: text("preview_url"),
  fileType: text("file_type"), // pdf | docx | xlsx | dwg | etc.
  fileSize: integer("file_size"),
  downloads: integer("downloads").default(0),
  isPremium: boolean("is_premium").default(false),
  status: text("status").default("published"), // draft | published | archived
  submittedBy: text("submitted_by"),
  createdAt: ts(),
  updatedAt: upd(),
});

export const btDownload = pgTable("bt_download", {
  id: id(),
  templateId: uuid("template_id").notNull().references(() => btTemplate.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: ts(),
});

export const btSubmission = pgTable("bt_submission", {
  id: id(),
  submittedBy: text("submitted_by").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  discipline: text("discipline"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  status: text("status").default("pending"), // pending | approved | rejected
  reviewNote: text("review_note"),
  createdAt: ts(),
});

/* ── Commerce: orders, vendor payouts, ledger (multivendor marketplace) ──── */
export const salesOrder = pgTable("sales_order", {
  id: id(),
  buyerUserId: text("buyer_user_id").notNull(),
  vendorCompanyId: uuid("vendor_company_id").references(() => company.id, { onDelete: "set null" }),
  vendorUserId: text("vendor_user_id"),
  customerName: text("customer_name"),
  customerCompany: text("customer_company"),
  status: text("status").default("pending"), // pending | processing | shipped | completed | cancelled
  payment: text("payment").default("pending"), // pending | paid | refunded
  subtotal: integer("subtotal").default(0),
  shipping: integer("shipping").default(0),
  vat: integer("vat").default(0),
  commission: integer("commission").default(0),
  vendorNet: integer("vendor_net").default(0),
  total: integer("total").default(0),
  deliveryMethod: text("delivery_method"),
  address: text("address"),
  phone: text("phone"),
  paymentRef: text("payment_ref"),
  provider: text("provider"), // demo | paystack | ...
  escrowState: text("escrow_state").default("held"), // held | released | refunded
  createdAt: ts(),
  updatedAt: upd(),
});

export const orderItem = pgTable("order_item", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => salesOrder.id, { onDelete: "cascade" }),
  productId: uuid("product_id"),
  variantId: uuid("variant_id").references(() => productVariant.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  image: text("image"),
});

export const vendorPaymentAccount = pgTable("vendor_payment_account", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  paystackSubaccountCode: text("paystack_subaccount_code"),
  bankCode: text("bank_code"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  dvaAccountNumber: text("dva_account_number"),
  dvaBank: text("dva_bank"),
  commissionPct: integer("commission_pct").default(10),
  createdAt: ts(),
  updatedAt: upd(),
});

export const ledgerEntry = pgTable("ledger_entry", {
  id: id(),
  orderId: uuid("order_id").references(() => salesOrder.id, { onDelete: "set null" }),
  vendorCompanyId: uuid("vendor_company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // sale | commission | payout | refund
  amount: integer("amount").notNull(),
  status: text("status").default("held"), // held | available | paid
  note: text("note"),
  createdAt: ts(),
});

export const vendorWallet = pgTable("vendor_wallet", {
  id: id(),
  companyId: uuid("company_id").notNull().unique().references(() => company.id, { onDelete: "cascade" }),
  balanceAvailable: integer("balance_available").default(0),
  balanceHeld: integer("balance_held").default(0),
  updatedAt: upd(),
});

/* ── Invoices ─────────────────────────────────────────────────────────── */
export const invoice = pgTable("invoice", {
  id: id(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: uuid("order_id").references(() => salesOrder.id, { onDelete: "set null" }),
  type: text("type").default("order"),
  issuerCompanyId: uuid("issuer_company_id").references(() => company.id, { onDelete: "set null" }),
  issuerName: text("issuer_name"),
  issuerAddress: text("issuer_address"),
  issuerEmail: text("issuer_email"),
  recipientUserId: text("recipient_user_id"),
  recipientName: text("recipient_name"),
  recipientCompany: text("recipient_company"),
  recipientAddress: text("recipient_address"),
  recipientEmail: text("recipient_email"),
  subtotal: integer("subtotal").default(0),
  vat: integer("vat").default(0),
  vatRate: integer("vat_rate").default(750),
  shipping: integer("shipping").default(0),
  discount: integer("discount").default(0),
  total: integer("total").default(0),
  currency: text("currency").default("NGN"),
  status: text("status").default("issued"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Support tickets ──────────────────────────────────────────────────── */
export const supportTicket = pgTable("support_ticket", {
  id: id(),
  reporterId: text("reporter_id").notNull(),
  reporterEmail: text("reporter_email"),
  category: text("category").default("other"),
  subject: text("subject").notNull(),
  description: text("description"),
  orderId: uuid("order_id").references(() => salesOrder.id, { onDelete: "set null" }),
  status: text("status").default("open"),
  priority: text("priority").default("medium"),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: ts(),
  updatedAt: upd(),
});

export const ticketMessage = pgTable("ticket_message", {
  id: id(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTicket.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderRole: text("sender_role").default("user"),
  body: text("body").notNull(),
  createdAt: ts(),
});

/* ── Buyer addresses ──────────────────────────────────────────────────── */
export const buyerAddress = pgTable("buyer_address", {
  id: id(),
  userId: text("user_id").notNull(),
  label: text("label"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  phone: text("phone"),
  isDefault: boolean("is_default").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Customer notes (exhibitor CRM) ───────────────────────────────────── */
export const customerNote = pgTable("customer_note", {
  id: id(),
  vendorCompanyId: uuid("vendor_company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  buyerUserId: text("buyer_user_id").notNull(),
  note: text("note").notNull(),
  createdAt: ts(),
});

/* ── Multi-role model ──────────────────────────────────────────────────
 * A user can hold multiple roles (professional, exhibitor) simultaneously,
 * unlocked progressively via intent + onboarding rather than chosen once at
 * signup. `user.role` (Better Auth additionalField) stays as a synced
 * "primary role" cache during rollout — this table is the source of truth.
 * Admin is intentionally NOT stackable here; it stays on `user.role` only. */
export const userRole = pgTable(
  "user_role",
  {
    id: id(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // professional | exhibitor
    status: text("status").default("active").notNull(), // active | revoked
    source: text("source").notNull(), // signup_legacy | self_serve_tier1 | kyc_approved | admin_grant
    plan: text("plan").default("free").notNull(), // per-role plan
    /** End of the paid term. Null on free rows and pre-0038 subscriptions. */
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** Tier to drop to at period end; null when no change is scheduled. */
    pendingPlan: text("pending_plan"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    grantedBy: text("granted_by"), // admin userId when source = admin_grant
    createdAt: ts(),
    updatedAt: upd(),
  },
  (t) => [uniqueIndex("user_role_user_id_role_idx").on(t.userId, t.role)],
);

/* ── Professional aptitude quiz ────────────────────────────────────────
 * A generic construction-industry question bank (not tied to any real
 * external certifying body). Passing an attempt is what actually grants
 * the professional role — see lib/services/quiz.ts. */
export const quizQuestion = pgTable("quiz_question", {
  id: id(),
  questionText: text("question_text").notNull(),
  imageUrl: text("image_url"),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: text("correct_option").notNull(), // A | B | C | D
  explanation: text("explanation"),
  examTag: text("exam_tag"), // admin-managed via taxonomy kind "quiz_exam"
  subjectTag: text("subject_tag"), // admin-managed via taxonomy kind "quiz_subject"
  year: integer("year"),
  timeLimitSeconds: integer("time_limit_seconds"), // null = no limit
  active: boolean("active").default(true),
  createdAt: ts(),
  updatedAt: upd(),
});

export const quizAttempt = pgTable("quiz_attempt", {
  id: id(),
  userId: text("user_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").notNull(), // [{ questionId, chosen, correct }]
  createdAt: ts(),
});

/* ── CRM broadcasts (simple V1 — no queue, sent via the existing Resend mailer) ── */
export const broadcastLog = pgTable("broadcast_log", {
  id: id(),
  subject: text("subject").notNull(),
  filterJson: text("filter_json").notNull(),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  sentBy: text("sent_by").notNull(),
  createdAt: ts(),
});

/* ── Communications (admin CRM) ─────────────────────────────────────────
 * Saved, rule-based audience segments and the email campaigns that target
 * them. `broadcastLog` above stays as the record of the older one-shot
 * blast tool; campaigns are the durable, schedulable version.
 */
export const audienceSegment = pgTable("audience_segment", {
  id: id(),
  name: text("name").notNull(),
  /** Serialised SegmentRule[] — see lib/services/segments.ts. */
  rulesJson: text("rules_json").notNull(),
  /** all = AND across rules, any = OR. */
  matchMode: text("match_mode").default("all").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: ts(),
  updatedAt: upd(),
});

export const emailCampaign = pgTable("email_campaign", {
  id: id(),
  name: text("name").notNull(),
  /** Set when targeting a saved segment; otherwise audienceKey applies. */
  segmentId: uuid("segment_id"),
  audienceKey: text("audience_key").default("all_users").notNull(),
  /** audienceKey = "manual": arbitrary addresses typed in by the admin. */
  manualEmails: text("manual_emails").array(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  fromName: text("from_name"),
  replyTo: text("reply_to"),
  bodyHtml: text("body_html").default("").notNull(),
  /** draft | pending_review | scheduled | sending | sent | failed */
  status: text("status").default("draft").notNull(),
  /** Approval trail — a plain admin submits, a super admin releases. */
  submittedBy: text("submitted_by"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: ts(),
  updatedAt: upd(),
});

export const emailCampaignEvent = pgTable("email_campaign_event", {
  id: id(),
  campaignId: uuid("campaign_id").notNull(),
  userId: text("user_id"),
  /** open | click */
  kind: text("kind").notNull(),
  url: text("url"),
  createdAt: ts(),
});

/* ── Helm (AI consultant) ───────────────────────────────────────────────
 * App-side metadata only. The RAG store (embeddings, knowledge chunks,
 * per-user memory) lives in the VM's own Postgres+pgvector — never here.
 * See helm/README.md and plans/HELM-BUILD-CHECKLIST.md. */

/** One Helm chat thread. Persisted per user so the history rail is searchable. */
export const helmConversation = pgTable("helm_conversation", {
  id: id(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("New conversation"),
  discipline: text("discipline"), // persona used; null = follow the profile default
  projectId: uuid("project_id"), // set when opened as a contextual copilot on a project
  archived: boolean("archived").default(false),
  createdAt: ts(),
  updatedAt: upd(),
});

/** A turn in a Helm thread. Assistant turns carry grounding + tool/proposal payloads. */
export const helmMessage = pgTable("helm_message", {
  id: id(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  citations: jsonb("citations"), // [{ ref, title, namespace, snippet }]
  tool: text("tool"),
  toolResult: jsonb("tool_result"),
  grounded: boolean("grounded").default(false), // false = answered without retrieved sources
  rating: integer("rating"), // 1 | -1 — feeds the admin answer-review queue
  createdAt: ts(),
});

/** A private document a professional gave Helm. Bytes live in the private R2 bucket. */
export const helmDocument = pgTable("helm_document", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull(), // private bucket key — never a public URL
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  namespace: text("namespace").notNull(), // user:{id} | project:{id}
  indexStatus: text("index_status").notNull().default("pending"), // pending | indexed | failed
  chunkCount: integer("chunk_count").default(0),
  error: text("error"),
  createdAt: ts(),
  updatedAt: upd(),
});

/** A confirm-gated write Helm proposed. Nothing mutates until status = applied. */
export const helmProposal = pgTable("helm_proposal", {
  id: id(),
  userId: text("user_id").notNull(),
  conversationId: uuid("conversation_id"),
  messageId: uuid("message_id"),
  tool: text("tool").notNull(),
  action: text("action").notNull(),
  params: jsonb("params").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("pending"), // pending | applied | rejected | failed
  error: text("error"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: ts(),
});

/** Per-user, per-month usage meter. Drives fair-use limits and the UI counter. */
export const helmUsage = pgTable("helm_usage", {
  id: id(),
  userId: text("user_id").notNull(),
  period: text("period").notNull(), // YYYY-MM
  messageCount: integer("message_count").default(0),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalLatencyMs: integer("total_latency_ms").default(0),
  cacheHits: integer("cache_hits").default(0),
  updatedAt: upd(),
  createdAt: ts(),
}, (t) => [uniqueIndex("helm_usage_user_period_idx").on(t.userId, t.period)]);

/**
 * Fair-use allowance. A row is either a PLAN default (`plan` set, `userId` null)
 * or a per-user override (`userId` set, `plan` null); the override wins.
 * `monthlyMessages` null = unlimited. Higher `priority` = served first.
 */
export const helmQuota = pgTable("helm_quota", {
  id: id(),
  plan: text("plan"), // free | plus | pro | premium
  userId: text("user_id"),
  monthlyMessages: integer("monthly_messages"),
  priority: integer("priority").default(0),
  note: text("note"),
  createdAt: ts(),
  updatedAt: upd(),
});

/* ── Platform settings ─────────────────────────────────────────────────
 * A keyed jsonb bag for platform-wide switches, read through
 * lib/services/platform-settings.ts. Currently holds the `maintenance` key;
 * anything the admin Settings page needs to persist lands here as a new key
 * rather than as a new table. Written by admins only. */
export const platformSetting = pgTable("platform_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: upd(),
  updatedBy: text("updated_by"), // admin userId that last wrote this key
});

/* ── Industry events (Phase 1 MVP) ─────────────────────────────────────
 * Admin-curated event listings (conferences, workshops, site visits…).
 * Members RSVP; the dashboard Events page splits upcoming vs past. */
export const event = pgTable("event", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("industry"),
  format: text("format").notNull().default("in_person"), // in_person | online | hybrid
  location: text("location"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  externalUrl: text("external_url"),
  organizer: text("organizer"),
  published: boolean("published").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: ts(),
  updatedAt: upd(),
});

export const eventRsvp = pgTable("event_rsvp", {
  id: id(),
  eventId: uuid("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("going"), // going | interested
  createdAt: ts(),
}, (t) => [uniqueIndex("event_rsvp_event_user_unique").on(t.eventId, t.userId)]);

/* ── Directory catalogue (admin-curated) ──────────────────────────────
 * Institutions and ministries listed on the tabbed Directory.
 * Not user accounts — admins create/edit them; members browse + export. */
export const catalogueEntry = pgTable("catalogue_entry", {
  id: id(),
  kind: text("kind").notNull(), // institution | ministry
  name: text("name").notNull(),
  acronym: text("acronym"),
  category: text("category"),
  location: text("location"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  about: text("about"),
  logoUrl: text("logo_url"),
  published: boolean("published").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: ts(),
  updatedAt: upd(),
});
