import { AddressBook } from "@/components/dashboard/buyer/address-book";
import { getMyAddresses } from "@/lib/services/addresses";

export const metadata = { title: "Address Book — Nomarc" };

export default async function AddressesPage() {
  const addresses = await getMyAddresses();
  return <AddressBook initialAddresses={addresses} />;
}
