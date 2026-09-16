"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { useRequireRole } from "@/lib/use-dashboard-role";
import { createProject, type ProjectInput } from "@/lib/services/projects";
import { uploadFile } from "@/lib/upload-client";

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 md:p-6">
      <h2 className="text-base font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
      <p className="text-[13px] text-[#9a9a9a] mt-0.5 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

/**
 * Every field here is now bound to state and persisted.
 *
 * This page used to be a mock: Title and Talent Role were uncontrolled inputs
 * with nothing reading them, the FileUpload fields had no `upload` handler so
 * images never left the browser, and both buttons just toasted success and
 * navigated to /dashboard. Nothing was ever written to the `project` table.
 */
export default function AddProjectPage() {
  const router = useRouter();
  const allowed = useRequireRole("professional"); // only professionals add portfolio projects
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [resp, setResp] = useState<string[]>([""]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [ongoing, setOngoing] = useState(false);
  const [desc, setDesc] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [pending, start_] = useTransition();

  if (!allowed) return null;

  function save(draft: boolean) {
    if (!title.trim()) { toast.error("Give the project a title."); return; }
    // Publishing is the public act, so it needs the accuracy confirmation;
    // saving a private draft does not.
    if (!draft && !confirm) { toast.error("Please confirm the project details."); return; }

    const payload: ProjectInput = {
      title, role, description: desc, coverUrl, gallery,
      responsibilities: resp, startDate: start, endDate: end, ongoing, draft,
    };

    start_(async () => {
      const res = await createProject(payload);
      if (!res.ok) { toast.error(res.error ?? "Couldn't save the project."); return; }
      toast.success(draft ? "Saved as draft." : "Project published!");
      router.push("/dashboard");
    });
  }

  return (
    <div className="px-6 md:px-8 py-6 max-w-[920px]">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[#1e1e1e] dark:text-white">Add new project</h1>
        <p className="text-sm text-[#9a9a9a] mt-0.5">Fill in the details below to add a new project to your portfolio.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="space-y-5">
        <Card title="Core Information" subtitle="Basic details, timeline, and your specific role on this project.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project Title">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Modern Residential Building" />
            </Field>
            <Field label="Talent Role">
              <input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Architect" />
            </Field>
            <Field label="Project Duration (start date)"><DatePicker value={start} onChange={setStart} placeholder="dd / mm / yy" /></Field>
            <Field label="Project Duration (end date)">
              <DatePicker value={ongoing ? "" : end} onChange={setEnd} placeholder={ongoing ? "Ongoing" : "dd / mm / yy"} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60">
            <input type="checkbox" checked={ongoing} onChange={(e) => { setOngoing(e.target.checked); if (e.target.checked) setEnd(""); }} className="accent-[#ffd716]" /> Ongoing project
          </label>
        </Card>

        <Card title="Context & Scope" subtitle="Provide a brief overview and detail your specific contributions to the project.">
          <Field label="Project Description">
            <div className="relative">
              <textarea rows={4} maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} className={inputClass} placeholder="Explain what the project was about…" />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[#b3b3b3]">{desc.length}/1000</span>
            </div>
          </Field>
          <div className="mt-4">
            <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Key Responsibilities</label>
            <div className="mt-2 space-y-2">
              {resp.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={s} onChange={(e) => setResp((prev) => prev.map((p, j) => j === i ? e.target.value : p))} className={inputClass} placeholder="e.g. Oversaw site inspections." />
                  <button type="button" onClick={() => setResp((prev) => prev.filter((_, j) => j !== i))} className="text-[#b3b3b3] hover:text-[#e5484d]"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setResp((p) => [...p, ""])} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-[13px] font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 transition-colors"><Plus size={14} /> Add</button>
          </div>
        </Card>

        <Card title="Media Uploads" subtitle="Select a primary cover image first, followed by supporting gallery images to provide visual context.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Cover Image</label>
              <p className="text-[11px] text-[#9a9a9a] mb-2">This will be the main thumbnail for your project</p>
              {/* `upload` was missing, so files were picked but never sent anywhere. */}
              <FileUpload
                accept="image/*" maxSizeMB={5}
                upload={(f) => uploadFile(f, "project")}
                onChange={(items) => setCoverUrl(items.find((i) => i.url)?.url ?? "")}
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#1e1e1e] dark:text-white">Project Gallery</label>
              <p className="text-[11px] text-[#9a9a9a] mb-2">Add additional photos</p>
              <FileUpload
                accept="image/*" maxSizeMB={5} multiple
                upload={(f) => uploadFile(f, "project")}
                onChange={(items) => setGallery(items.map((i) => i.url).filter((u): u is string => !!u))}
              />
            </div>
          </div>
        </Card>

        <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-[13px] text-[#6b6b6b] dark:text-white/60"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="accent-[#ffd716]" /> I confirm these project details are accurate and comply with platform guidelines.</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end w-full sm:w-auto">
            <button type="button" disabled={pending} onClick={() => router.push("/dashboard")} className="px-4 py-2.5 sm:py-2 text-sm font-medium text-[#6b6b6b] dark:text-white/70 hover:text-[#1e1e1e] dark:hover:text-white whitespace-nowrap disabled:opacity-50">Cancel</button>
            <button type="button" disabled={pending} onClick={() => save(true)} className="px-4 py-2.5 sm:py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-white/5 whitespace-nowrap text-center disabled:opacity-50">Save as draft</button>
            <button type="submit" disabled={pending} className="px-5 py-2.5 sm:py-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors whitespace-nowrap text-center disabled:opacity-50">{pending ? "Saving…" : "Publish project"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
