import { Lock } from "lucide-react";
import { EmptyState, type EmptyCta } from "./empty-state";

/**
 * "Unlock Access" gate — the padlock variant shown when a feature needs a
 * completed profile / verification tier before it can be used. Wraps EmptyState
 * with a lock glyph. Title defaults to "Unlock Access"; pass a CTA that routes
 * to the thing they must complete (e.g. "Complete Profile Details").
 */
export function LockedState({
  title = "Unlock Access",
  description,
  cta,
  className,
}: {
  title?: string;
  description: string;
  cta: EmptyCta;
  className?: string;
}) {
  return <EmptyState icon={Lock} title={title} description={description} primary={cta} className={className} />;
}
