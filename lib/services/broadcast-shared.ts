/** Client-safe shared constants for the broadcast tool. Kept OUT of
 *  lib/services/broadcasts.ts ("use server") because client components may not
 *  import plain values from a server-actions module — Next.js treats the whole
 *  module as action-only and strips the export, which fails the build. */
export const QUEUE_THRESHOLD = 4000;