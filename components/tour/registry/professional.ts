import { anchor, centerStep, mobileNavStep, navStep, type TourDef } from "./types";

/* ── Helm consultant — the flagship walkthrough (page tour on /ai-consultant) ── */
export const helmPage: TourDef = {
  id: "helm-page",
  audience: "professional",
  kind: "page",
  route: "/dashboard/ai-consultant",
  steps: [
    {
      key: "helm-intro",
      target: "body",
      placement: "center",
      icon: "helm",
      showEstimate: true,
      title: "Meet Nomabot",
      content:
        "Nomabot is your construction consultant — it plans projects, reviews contracts and BOQs, looks up codes, and drafts changes for your board. Here's the two-minute tour.",
    },
    {
      key: "helm-composer",
      target: anchor("helm-composer"),
      placement: "top",
      icon: "penSquare",
      title: "Ask anything",
      content:
        "Type a question or a task. Nomabot answers grounded in real sources and tells you plainly when it doesn't know — it won't invent a code clause or a rate.",
    },
    {
      key: "helm-persona",
      target: anchor("helm-persona"),
      placement: "bottom",
      icon: "compass",
      title: "It adapts to your discipline",
      content:
        "Nomabot frames answers for your field automatically. Working across a boundary? Switch personas here to consult as an architect, QS, structural, MEP, builder or surveyor.",
    },
    {
      key: "helm-history",
      target: anchor("helm-history"),
      placement: "right",
      icon: "inbox",
      desktopOnly: true,
      title: "Your conversations",
      content:
        "Every chat is saved and searchable, so you can pick up an earlier thread — a contract review, a cost query — right where you left it.",
    },
    {
      key: "helm-usage",
      target: anchor("helm-usage"),
      placement: "right",
      icon: "gauge",
      desktopOnly: true,
      optional: true,
      title: "Your monthly allowance",
      content:
        "Your plan includes a monthly message allowance. Track what's left here — upgrade any time for a larger allowance and higher priority.",
    },
  ],
};

/* ── Project Management page tour ── */
export const pmPage: TourDef = {
  id: "pm-page",
  audience: "professional",
  kind: "page",
  route: "/dashboard/project-management",
  steps: [
    {
      key: "pm-intro",
      target: "body",
      placement: "center",
      icon: "kanban",
      showEstimate: true,
      title: "Your projects",
      content:
        "Plan and run every project on a board. Create one, break it into tasks across columns, and track what's due and what's overdue.",
    },
    {
      key: "pm-new",
      target: anchor("pm-new-project"),
      placement: "bottom",
      icon: "plus",
      optional: true,
      title: "Start a project",
      content: "Spin up a new project with To do / In progress / Review / Done columns ready to fill.",
    },
    {
      key: "pm-helm",
      target: anchor("helm-copilot"),
      placement: "left",
      icon: "helm",
      optional: true,
      title: "Let Nomabot plan it",
      content:
        "Ask Nomabot to draft a programme or tasks. It proposes the changes as a diff — nothing lands on your board until you confirm.",
    },
  ],
};

/* ── Professional welcome (first run) ── */
export const professionalWelcome: TourDef = {
  id: "professional-welcome",
  audience: "professional",
  kind: "welcome",
  steps: [
    centerStep({
      key: "welcome-hello",
      icon: "sparkles",
      showEstimate: true,
      title: "Welcome to Nomarc",
      content: "A quick orientation to your dashboard — where to find work, your tools, and the marketplace. Under a minute.",
    }),
    navStep("sidebar-nav", {
      key: "welcome-nav",
      icon: "panelLeft",
      title: "Everything's in the sidebar",
      content: "Grouped by what you're doing: Jobs, Applications, the Exhibition Hub and your Directory.",
    }),
    mobileNavStep("mobile-menu", {
      key: "welcome-nav-mobile",
      icon: "panelLeft",
      title: "Your menu lives here",
      content: "Tap the menu for Jobs, Applications, the Exhibition Hub and your Directory — the same sections you'd see on a wider screen.",
    }),
    navStep("nav-helm", {
      key: "welcome-helm",
      icon: "helm",
      optional: true,
      title: "Meet Nomabot, under Tools",
      content: "Your AI consultant lives here — advice for your discipline, contract and BOQ review, and a hand planning projects.",
    }),
    navStep("nav-jobs", {
      key: "welcome-jobs",
      icon: "briefcase",
      optional: true,
      title: "Find and post work",
      content: "Browse jobs, track applications, and post your own once you set up an employer profile.",
    }),
    mobileNavStep("mobile-nav", {
      key: "welcome-jobs-mobile",
      icon: "briefcase",
      title: "Jump straight to the essentials",
      content: "Home, Jobs, Messages and Products are one tap away down here, wherever you are in the app.",
    }),
    navStep("role-switcher", {
      key: "welcome-roles",
      icon: "compass",
      optional: true,
      title: "Hold more than one role?",
      content: "Once you're also an Exhibitor or Employer, switch between dashboards right here — nothing you unlock is ever lost.",
    }),
    centerStep({
      key: "welcome-done",
      icon: "thumbsUp",
      title: "You're set",
      content: "Explore at your own pace — replay any tour from the guide button in the top bar whenever you want a refresher.",
    }),
  ],
};

/* ── Professional walkthrough — cross-page tour of the whole dashboard ──
 * Every `route` must stay inside /dashboard: the public Exhibition Hub is a
 * different layout tree and navigating there unmounts the TourProvider, killing
 * the tour mid-flight. The hub gets described, and handed off with a link. */
export const professionalWalkthrough: TourDef = {
  id: "professional-walkthrough",
  audience: "professional",
  kind: "walkthrough",
  steps: [
    centerStep({ key: "wt-pro-intro", icon: "compass", showEstimate: true, title: "The full tour", content: "A stop on each page of your dashboard — jobs, applications, the marketplace, your network and Nomabot." }),
    { ...centerStep({ key: "wt-pro-jobs", icon: "briefcase", title: "Browse jobs", content: "Filter by location, salary and work model, then apply straight from a listing." }), route: "/dashboard/jobs", page: "Jobs" },
    { ...centerStep({ key: "wt-pro-apps", icon: "fileText", title: "Track your applications", content: "See status at a glance, and pick up drafts right where you left off." }), route: "/dashboard/applications", page: "Applications" },
    { ...centerStep({ key: "wt-pro-hub", icon: "store", title: "Source materials & equipment", content: "Browse the Exhibition Hub, save favourites, and request quotes from exhibitors." }), route: "/dashboard/products", page: "Exhibition Hub" },
    { ...centerStep({ key: "wt-pro-directory", icon: "users", title: "Your network", content: "Search professionals and companies, and save leads into custom lists." }), route: "/dashboard/people", page: "Directory" },
    { ...centerStep({ key: "wt-pro-helm", icon: "helm", title: "Ask Nomabot", content: "Your AI construction consultant — contract review, BOQs, and code lookups, grounded in real sources." }), route: "/dashboard/ai-consultant", page: "Nomabot" },
    { ...centerStep({ key: "wt-pro-done", icon: "thumbsUp", title: "That's the tour", content: "Head back to your dashboard home to check your profile completeness and recent activity." }), route: "/dashboard", page: "Dashboard" },
  ],
};

export const professionalTours: TourDef[] = [
  helmPage,
  pmPage,
  professionalWelcome,
  professionalWalkthrough,
];
