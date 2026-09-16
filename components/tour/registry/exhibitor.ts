import { centerStep, mobileNavStep, navStep, type TourDef } from "./types";

/* ── Exhibitor welcome (first run) ── */
export const exhibitorWelcome: TourDef = {
  id: "exhibitor-welcome",
  audience: "exhibitor",
  kind: "welcome",
  steps: [
    centerStep({
      key: "exh-hello",
      icon: "store",
      showEstimate: true,
      title: "Welcome to your storefront",
      content: "A quick look at where you list products, promote your catalog, and reach buyers.",
    }),
    navStep("sidebar-nav", {
      key: "exh-nav",
      icon: "panelLeft",
      title: "Your dashboard, tabbed",
      content: "Your home has four tabs — Overview, Catalog, Recommendations and Ads Board. The sidebar covers quote requests, messages and your Directory.",
    }),
    mobileNavStep("mobile-menu", {
      key: "exh-nav-mobile",
      icon: "panelLeft",
      title: "Your dashboard, tabbed",
      content: "Your home has four tabs — Overview, Catalog, Recommendations and Ads Board. This menu covers quote requests, messages and your Directory.",
    }),
    navStep("role-switcher", {
      key: "exh-roles",
      icon: "compass",
      optional: true,
      title: "Hold more than one role?",
      content: "Also a Professional or Employer? Switch between your dashboards right here.",
    }),
    centerStep({
      key: "exh-done",
      icon: "thumbsUp",
      title: "You're set",
      content: "Add your first product from the Catalog tab. Replay this tour any time from the guide button in the top bar.",
    }),
  ],
};

/* ── Exhibitor walkthrough — cross-page tour of the storefront ── */
export const exhibitorWalkthrough: TourDef = {
  id: "exhibitor-walkthrough",
  audience: "exhibitor",
  kind: "walkthrough",
  steps: [
    centerStep({ key: "wt-exh-intro", icon: "compass", showEstimate: true, title: "The full tour", content: "A stop on each page — your catalog, incoming enquiries, hiring, and your network." }),
    { ...centerStep({ key: "wt-exh-catalog", icon: "boxes", title: "Manage your catalog", content: "Add products, edit specs, and track drafts before they publish to the Exhibition Hub." }), route: "/dashboard/my-products", page: "Catalog" },
    { ...centerStep({ key: "wt-exh-quotes", icon: "quote", title: "Read your quote requests", content: "Every enquiry a buyer sends about your products lands here — this is the queue your dashboard has been counting." }), route: "/dashboard/quotes", page: "Quote Requests" },
    { ...centerStep({ key: "wt-exh-jobs", icon: "briefcase", title: "Hiring too?", content: "Set up an employer profile to post roles and review candidates from here." }), route: "/dashboard/jobs/posted", page: "Posted Jobs" },
    { ...centerStep({ key: "wt-exh-directory", icon: "users", title: "Find professionals & companies", content: "Search the Directory and save contacts into lists for later." }), route: "/dashboard/people", page: "Directory" },
    { ...centerStep({ key: "wt-exh-done", icon: "thumbsUp", title: "That's the tour", content: "Head to the Catalog tab on your dashboard home to add your first product." }), route: "/dashboard", page: "Dashboard" },
  ],
};

export const exhibitorTours: TourDef[] = [exhibitorWelcome, exhibitorWalkthrough];
