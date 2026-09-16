import { redirect } from "next/navigation";

export default function KycPage() {
  redirect("/dashboard/profile?tab=verification");
}
