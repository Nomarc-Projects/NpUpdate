import { getViewer } from "@/lib/viewer-server";
import { AccountSettingsClient } from "./account-settings-client";

export default async function AccountSettingsPage() {
  const viewer = await getViewer();
  const heldRoles = Array.from(viewer.heldRoles);
  return <AccountSettingsClient heldRoles={heldRoles} />;
}
