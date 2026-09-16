"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { saveProfile, type ProfileData } from "@/lib/services/profile";
import { uploadFile } from "@/lib/upload-client";
import { lgasFor } from "@/lib/data/nigeria-lga";
import { COUNTRIES, statesFor } from "@/lib/data/countries";

/** Stand-in until the member uploads a picture. Exported so the profile header
 *  falls back to the same mark rather than a stock photo of someone else. */
export const DEFAULT_AVATAR = "/logos/mark-on-light.png";

/** Location is stored as one string ("address, LGA, State, Country"). Split it
 *  back into its parts by matching the tail against the country/state/LGA
 *  datasets; anything that doesn't match (older free-text values) falls back to
 *  the address field. */
function parseLocation(loc: string): { address: string; state: string; lga: string; country: string } {
  const parts = (loc ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { address: "", state: "", lga: "", country: "" };
  const countryTail = parts[parts.length - 1].trim();
  const country = COUNTRIES.find((c) => c.toLowerCase() === countryTail.toLowerCase()) ?? "";
  if (!country) return { address: parts.join(", "), state: "", lga: "", country: "" };
  let rest = parts.slice(0, -1);
  const stateTail = rest.length ? (rest[rest.length - 1].replace(/\s+state(\s|$)/i, "$1").trim() ?? rest[rest.length - 1]) : "";
  const state = statesFor(country).find((s) => s.toLowerCase() === stateTail.toLowerCase()) ?? "";
  if (state) rest = rest.slice(0, -1);
  let lga = "";
  if (state && country.toLowerCase() === "nigeria") {
    const lgaMatch = rest.length ? lgasFor(state).find((l) => l.toLowerCase() === rest[rest.length - 1].toLowerCase()) : undefined;
    if (lgaMatch) { lga = lgaMatch; rest = rest.slice(0, -1); }
  }
  return { address: rest.join(", "), state, lga, country };
}

export function PublicProfileForm({ initial }: { initial?: ProfileData }) {
  const router = useRouter();
  const [initialName] = useState((initial?.name ?? "").trim().split(/\s+/).filter(Boolean));
  const [firstName, setFirstName] = useState(initialName[0] ?? "");
  const [lastName, setLastName] = useState(initialName.slice(1).join(" "));
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const parsed = parseLocation(initial?.location ?? "");
  const [address, setAddress] = useState(parsed.address);
  const [country, setCountry] = useState(parsed.country);
  const [stateName, setStateName] = useState(parsed.state);
  const [lga, setLga] = useState(parsed.lga);
  // Bio and practice status (license number, company details) are no longer
  // offered in this basic-profile form — bio lives in the Find-work onboarding
  // and the practice status fields aren't curated here anymore. Pass stored
  // values straight back so saving never wipes them.
  const [avatar, setAvatar] = useState(initial?.avatarUrl || DEFAULT_AVATAR);
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)."); return; }
    const local = URL.createObjectURL(file);
    setAvatar(local); setUploading(true);
    try {
      const url = await uploadFile(file, "avatar");
      setAvatar(url); setAvatarUrl(url);
      await saveProfile({ avatarUrl: url });
      toast.success("Picture updated");
      router.refresh();
    } catch (e) {
      setAvatar(avatarUrl || DEFAULT_AVATAR);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); URL.revokeObjectURL(local); }
  }

  function removeAvatar() {
    setAvatar(DEFAULT_AVATAR); setAvatarUrl("");
    saveProfile({ avatarUrl: "" }).then(() => { toast("Picture removed"); router.refresh(); }).catch(() => toast.error("Failed"));
  }

  function save() {
    const location = [address.trim(), lga.trim(), stateName.trim(), country.trim()].filter(Boolean).join(", ");
    const firstToSave = firstName.trim();
    const lastToSave = lastName.trim();
    if (!firstToSave) { toast.error("Please enter your first name."); return; }
    const name = lastToSave ? `${firstToSave} ${lastToSave}` : firstToSave;
    const headlineToSave = headline.trim();
    if (!headlineToSave) {
      toast.error("Please enter your occupation.");
      return;
    }
    // Availability is set in the Find-work onboarding (not this form), so any
    // stored value — including an employer's "hiring" — is preserved untouched.
    const avail = initial?.availability ?? "";
    start(async () => {
      try {
        await saveProfile({
          name, phone: phone.trim(), headline: headlineToSave, location, availability: avail, bio: initial?.bio ?? "", avatarUrl,
          practiceStatus: initial?.practiceStatus ?? "",
          licenseNumber: initial?.licenseNumber ?? "",
          practiceCompanyName: initial?.practiceCompanyName ?? "",
          practiceRegNumber: initial?.practiceRegNumber ?? "",
          practiceCompanyAddress: initial?.practiceCompanyAddress ?? "",
          practiceCompanyBio: initial?.practiceCompanyBio ?? "",
        });
        toast.success("Changes saved");
        router.refresh();
      } catch { toast.error("Could not save changes"); }
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      {/* avatar row */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="Profile" className={`w-20 h-20 rounded-full ring-2 ring-[#ffd716]/40 ${avatar === DEFAULT_AVATAR ? "object-contain p-4 bg-white dark:bg-white" : "object-cover"}`} />
          {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-50">{uploading ? "Uploading…" : "Upload new picture"}</button>
            <button type="button" onClick={removeAvatar} className="px-4 py-2 rounded-lg bg-[#f3f3f3] dark:bg-white/10 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#e9e9e9] dark:hover:bg-white/15 transition-colors">Delete</button>
          </div>
          <p className="text-[11.5px] text-[#9a9a9a]">PNG, JPG or WEBP — up to 8MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="First name">
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. John" />
        </Field>
        <Field label="Last name">
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Doe" />
        </Field>
        <Field label="Phone number">
          <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 901 2345 678" />
        </Field>
        <Field label="Occupation">
          <input className={inputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Architect, Crane Operator" />
        </Field>
        <Field label="Country">
          <SelectMenu
            placeholder="Select country"
            value={country}
            onChange={(v) => {
              setCountry(v);
              setStateName("");
              setLga("");
            }}
            options={COUNTRIES}
          />
        </Field>
        <Field label="State / Region">
          <SelectMenu
            placeholder={country ? "Select state" : "Select country first"}
            value={stateName}
            onChange={(v) => { setStateName(v); setLga((cur) => (lgasFor(v).includes(cur) ? cur : "")); }}
            options={country ? statesFor(country) : []}
          />
        </Field>
        {country && country.toLowerCase() === "nigeria" ? (
          <Field label="Local Government Area" hint={stateName ? undefined : "Select a state first"}>
            <SelectMenu
              placeholder={stateName ? "Select LGA" : "Select a state first"}
              value={lga}
              onChange={setLga}
              options={lgasFor(stateName)}
            />
          </Field>
        ) : null}
        <Field label="Address">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 py-4 mt-2 border-t border-[#ececec] dark:border-white/10">
        <GhostButton type="button" onClick={() => router.refresh()}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </form>
  );
}
