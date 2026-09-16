"use client";

import { useEffect, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { toast } from "sonner";
import { ShortcodeMenu } from "./shortcode-menu";
import { URL_SHORTCODES } from "./email-shortcodes";

/**
 * Call-to-action button as a first-class TipTap node.
 *
 * It used to be inserted as a Link mark carrying inline styles. That could never
 * look like a button: TipTap's Link mark only preserves href/target/rel/class, so
 * the `style` attribute was dropped on parse, and `.news-prose a` in globals.css
 * then painted it as underlined #caa400 text. Clicking it also behaved like a
 * link rather than reopening its settings, and there was no way to edit one after
 * insertion.
 *
 * As a node, the styling survives in attributes, the editor can render a real
 * button through a node view, and a click can reopen the designer.
 */
export type ButtonDesign = {
  label: string;
  url: string;
  bg: string;
  fg: string;
  radius: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fullWidth: boolean;
};

export const BUTTON_DEFAULTS: ButtonDesign = {
  label: "Click Here",
  url: "",
  bg: "#ffd716",
  fg: "#1e1e1e",
  radius: 10,
  fontSize: 15,
  bold: true,
  italic: false,
  underline: false,
  fullWidth: false,
};

/**
 * Inline styles only: Gmail and Outlook strip <style> blocks, so a class-based
 * button arrives as a bare link.
 *
 * Full width is `display:block;width:100%` on the anchor rather than a wrapping
 * table. A table would be marginally more robust in Outlook desktop, but tables
 * are not in this editor's schema, so one would be stripped the moment an admin
 * reopened the campaign; a button that survives editing beats a button that
 * renders two pixels better in one client.
 */
export function buttonStyle(d: ButtonDesign): string {
  const width = d.fullWidth ? "display:block;width:100%;box-sizing:border-box;text-align:center;" : "display:inline-block;";
  return (
    `${width}background-color:${d.bg};color:${d.fg};` +
    `font-weight:${d.bold ? 700 : 400};font-style:${d.italic ? "italic" : "normal"};` +
    `font-size:${d.fontSize}px;text-decoration:${d.underline ? "underline" : "none"};` +
    `padding:14px 26px;border-radius:${d.radius}px;mso-padding-alt:14px 26px;font-family:inherit;`
  );
}

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (v: unknown) => v === true || v === "true";

export const CtaButton = Node.create({
  name: "ctaButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: BUTTON_DEFAULTS.label },
      url: { default: BUTTON_DEFAULTS.url },
      bg: { default: BUTTON_DEFAULTS.bg },
      fg: { default: BUTTON_DEFAULTS.fg },
      radius: { default: BUTTON_DEFAULTS.radius },
      fontSize: { default: BUTTON_DEFAULTS.fontSize },
      bold: { default: BUTTON_DEFAULTS.bold },
      italic: { default: BUTTON_DEFAULTS.italic },
      underline: { default: BUTTON_DEFAULTS.underline },
      fullWidth: { default: BUTTON_DEFAULTS.fullWidth },
    };
  },

  /**
   * The design is read back from `data-*` attributes rather than by parsing the
   * inline `style` string. Mail clients ignore unknown attributes, so carrying
   * both keeps the stored HTML email-safe *and* losslessly re-editable.
   *
   * `priority: 1001` outranks the Link mark's `a[href]` rule (priority 1000):
   * without it, TipTap re-parses a saved CTA anchor as a plain link mark and the
   * button degrades to underlined text on reopen.
   */
  parseHTML() {
    return [
      {
        priority: 1001,
        tag: "a[data-cta-button]",
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return {
            label: el.textContent || BUTTON_DEFAULTS.label,
            url: el.getAttribute("href") || "",
            bg: el.getAttribute("data-bg") || BUTTON_DEFAULTS.bg,
            fg: el.getAttribute("data-fg") || BUTTON_DEFAULTS.fg,
            radius: num(el.getAttribute("data-radius"), BUTTON_DEFAULTS.radius),
            fontSize: num(el.getAttribute("data-font-size"), BUTTON_DEFAULTS.fontSize),
            bold: bool(el.getAttribute("data-bold")),
            italic: bool(el.getAttribute("data-italic")),
            underline: bool(el.getAttribute("data-underline")),
            fullWidth: bool(el.getAttribute("data-full-width")),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const d = node.attrs as ButtonDesign;
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: d.url,
        style: buttonStyle(d),
        "data-cta-button": "true",
        "data-bg": d.bg,
        "data-fg": d.fg,
        "data-radius": String(d.radius),
        "data-font-size": String(d.fontSize),
        "data-bold": String(d.bold),
        "data-italic": String(d.italic),
        "data-underline": String(d.underline),
        "data-full-width": String(d.fullWidth),
      }),
      d.label,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaButtonView);
  },
});

/**
 * In-editor rendering. Deliberately a <button>, not an <a>: clicking must reopen
 * the designer, never navigate away and lose unsaved campaign copy.
 */
function CtaButtonView({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const d = node.attrs as ButtonDesign;

  return (
    <NodeViewWrapper
      as="div"
      className={`my-3 ${d.fullWidth ? "" : "inline-block"}`}
      data-drag-handle
    >
      <button
        type="button"
        // contentEditable=false keeps ProseMirror from treating the label as text
        // the caret can wander into; the whole node is an atom.
        contentEditable={false}
        onClick={() => { if (editor.isEditable) setOpen(true); }}
        title="Edit this button"
        style={{
          display: d.fullWidth ? "block" : "inline-block",
          width: d.fullWidth ? "100%" : undefined,
          backgroundColor: d.bg,
          color: d.fg,
          fontWeight: d.bold ? 700 : 400,
          fontStyle: d.italic ? "italic" : "normal",
          textDecoration: d.underline ? "underline" : "none",
          fontSize: `${d.fontSize}px`,
          padding: "14px 26px",
          borderRadius: `${d.radius}px`,
          cursor: editor.isEditable ? "pointer" : "default",
          outline: selected ? "2px solid #1e1e1e" : "none",
          outlineOffset: 2,
        }}
      >
        {d.label || "Click Here"}
      </button>
      {!d.url && (
        <span className="ml-2 align-middle text-[11.5px] font-medium text-[#c0392b]">No link set</span>
      )}
      <ButtonDialog
        open={open}
        initial={d}
        mode="edit"
        onClose={() => setOpen(false)}
        onSubmit={(next) => { updateAttributes(next); setOpen(false); }}
      />
    </NodeViewWrapper>
  );
}

/** Button designer, used both to insert a new CTA and to edit an existing one. */
export function ButtonDialog({
  open,
  initial,
  mode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: ButtonDesign;
  mode: "insert" | "edit";
  onClose: () => void;
  onSubmit: (d: ButtonDesign) => void;
}) {
  const [d, setD] = useState<ButtonDesign>(initial ?? BUTTON_DEFAULTS);

  // Reseed each time it opens, so editing shows the button's real values rather
  // than whatever the previous invocation left behind.
  useEffect(() => {
    if (open) setD(initial ?? BUTTON_DEFAULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const set = <K extends keyof ButtonDesign>(k: K, v: ButtonDesign[K]) => setD((p) => ({ ...p, [k]: v }));

  const field =
    "w-full rounded-lg border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent px-3 py-2 text-[13px] text-[#1e1e1e] dark:text-white focus:outline-none focus:border-[#ffd716]";

  const submit = () => {
    if (!d.label.trim()) { toast.error("Give the button a label."); return; }
    if (!d.url.trim()) { toast.error("Give the button a URL or a merge tag."); return; }
    onSubmit(d);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[840px] overflow-y-auto rounded-2xl border border-[#ececec] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1e1e1e]"
      >
        <h2 className="text-[18px] font-bold text-[#1e1e1e] dark:text-white">
          {mode === "edit" ? "Edit Your Button" : "Design Your Button"}
        </h2>
        <div className="mt-4 h-px bg-[#f0f0f0] dark:bg-white/10" />

        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_300px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Button Text</span>
              <input className={field} value={d.label} onChange={(e) => set("label", e.target.value)} placeholder="Click Here" />
            </label>

            <div className="block">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Button URL</span>
                {/* A CTA target is very often a merge tag rather than a literal
                    link; the migration blast's whole purpose is
                    {{reset_password_url}}. */}
                <ShortcodeMenu
                  items={URL_SHORTCODES}
                  label="Use a tag"
                  align="right"
                  onPick={(token) => set("url", token)}
                />
              </div>
              <input className={field} value={d.url} onChange={(e) => set("url", e.target.value)} placeholder="https://… or {{dashboard_url}}" />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Background Color</span>
              <input type="color" value={d.bg} onChange={(e) => set("bg", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[#e3e3e3] bg-white p-1 dark:border-white/15 dark:bg-transparent" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Text Color</span>
              <input type="color" value={d.fg} onChange={(e) => set("fg", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[#e3e3e3] bg-white p-1 dark:border-white/15 dark:bg-transparent" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Border Radius <span className="font-normal text-[#9a9a9a]">{d.radius}px</span></span>
              <input type="range" min={0} max={40} value={d.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full accent-[#ffd716]" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Font Size <span className="font-normal text-[#9a9a9a]">{d.fontSize}px</span></span>
              <input type="range" min={11} max={28} value={d.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))} className="w-full accent-[#ffd716]" />
            </label>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Width</span>
              <label className="flex items-center gap-2 text-[13px] text-[#1e1e1e] dark:text-white">
                <input type="checkbox" checked={d.fullWidth} onChange={(e) => set("fullWidth", e.target.checked)} className="h-4 w-4 accent-[#ffd716]" />
                Full width
                <span className="text-[11.5px] text-[#9a9a9a]">Fills the email column; best for a primary action</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white">Font Style</span>
              <div className="flex flex-wrap gap-4">
                {([["bold", "Bold"], ["italic", "Italic"], ["underline", "Underline"]] as const).map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-[13px] text-[#1e1e1e] dark:text-white">
                    <input type="checkbox" checked={d[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-[#ffd716]" />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#ececec] dark:border-white/10">
            <p className="rounded-t-xl bg-[#fafafa] px-3 py-2 text-center text-[12px] font-semibold text-[#6b6b6b] dark:bg-white/[0.03] dark:text-white/60">Button Preview</p>
            <div className={`flex min-h-[180px] items-center p-5 ${d.fullWidth ? "" : "justify-center"}`}>
              <span
                style={{
                  display: d.fullWidth ? "block" : "inline-block",
                  width: d.fullWidth ? "100%" : undefined,
                  backgroundColor: d.bg,
                  color: d.fg,
                  fontWeight: d.bold ? 700 : 400,
                  fontStyle: d.italic ? "italic" : "normal",
                  textDecoration: d.underline ? "underline" : "none",
                  fontSize: `${d.fontSize}px`,
                  padding: "14px 26px",
                  borderRadius: `${d.radius}px`,
                  textAlign: "center",
                }}
              >
                {d.label || "Click Here"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="w-full rounded-lg border border-[#e3e3e3] px-5 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white sm:w-auto">Cancel</button>
          <button onClick={submit} className="w-full rounded-lg bg-[#ffd716] px-6 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] sm:w-auto">
            {mode === "edit" ? "Save changes" : "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}
