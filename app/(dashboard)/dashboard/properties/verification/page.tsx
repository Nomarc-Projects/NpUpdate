import { redirect } from "next/navigation";

export const metadata = { title: "Add property" };

/** Preserve old notification/bookmark links while keeping verification inside Add Property. */
export default function ListerVerificationPage() {
  redirect("/dashboard/properties/new");
}
