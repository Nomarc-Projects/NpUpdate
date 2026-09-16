import type { StackableRole } from "@/lib/entitlements";

/**
 * Shared source of truth for email notification preference toggles — used by
 * the Account Settings "Email Notifications" tab
 * (`components/dashboard/settings/panels/notifications-panel.tsx`,
 * `lib/services/notification-prefs.ts`) and reusable from `lib/email/mailer.ts`
 * so a given outbound email type can check `DEFAULT_NOTIFICATION_PREFS` /
 * look up its group before sending. Copy transcribed verbatim from the
 * Figma "Notification Preferences" screenshot.
 */
export type NotificationPrefKey =
  | "security_alerts"
  | "platform_updates"
  | "newsletter"
  | "direct_messages"
  | "job_matches"
  | "application_updates"
  | "profile_views"
  | "messages_quotes"
  | "new_applications"
  | "candidate_messages"
  | "job_listing_status";

export type NotificationToggle = {
  key: NotificationPrefKey;
  label: string;
  description: string;
  defaultOn: boolean;
};

export type NotificationGroup = {
  /** "general" is always visible; the rest are gated behind `heldRoles`. */
  group: "general" | StackableRole;
  title: string;
  toggles: NotificationToggle[];
};

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    group: "general",
    title: "General Account",
    toggles: [
      { key: "security_alerts", label: "Security & Login Alerts", description: "Notify me of new sign-ins from unrecognized devices or password changes.", defaultOn: true },
      { key: "platform_updates", label: "Platform Updates & Maintenance", description: "Receive announcements about new platform features or scheduled downtime.", defaultOn: true },
      { key: "newsletter", label: "Newsletter & Insights", description: "Receive industry trends, platform highlights, and community news.", defaultOn: true },
    ],
  },
  {
    group: "professional",
    title: "Professional Profile",
    toggles: [
      { key: "direct_messages", label: "Direct Messages", description: "Notify me when I receive a new message.", defaultOn: true },
      { key: "job_matches", label: "Job Matches", description: "Notify me when new jobs are posted that match my skills and preferences.", defaultOn: false },
      { key: "application_updates", label: "Application Updates", description: "Notify me when an employer views my application or updates my application status.", defaultOn: true },
      { key: "profile_views", label: "Profile Views", description: "Notify me when a company or recruiter views my profile.", defaultOn: false },
    ],
  },
  {
    group: "exhibitor",
    title: "Exhibitor Profile",
    toggles: [
      { key: "messages_quotes", label: "Messages & Quotes", description: "Email me when a professional or company sends a direct message or requests a quote.", defaultOn: true },
    ],
  },
  {
    group: "employer",
    title: "Employer Profile",
    toggles: [
      { key: "new_applications", label: "New Applications", description: "Notify me when a candidate applies to one of my active job posts.", defaultOn: true },
      { key: "candidate_messages", label: "Candidate Messages", description: "Notify me of new messages from applicants or sourced professionals.", defaultOn: false },
      { key: "job_listing_status", label: "Job Listing Status", description: "Notify me when my job posts are expiring soon, require renewal, or have been approved.", defaultOn: true },
    ],
  },
];

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationPrefKey, boolean> = NOTIFICATION_GROUPS
  .flatMap((g) => g.toggles)
  .reduce((acc, t) => { acc[t.key] = t.defaultOn; return acc; }, {} as Record<NotificationPrefKey, boolean>);

/** Resolve a preference with fallback to its documented default (sparse-storage friendly). */
export function resolvePref(prefs: Partial<Record<NotificationPrefKey, boolean>> | null | undefined, key: NotificationPrefKey): boolean {
  const v = prefs?.[key];
  return typeof v === "boolean" ? v : DEFAULT_NOTIFICATION_PREFS[key];
}
