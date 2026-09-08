"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Minus,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-client";
import { ShortcodeMenu } from "@/components/admin/shortcode-menu";
import { CtaButton, ButtonDialog, type ButtonDesign } from "@/components/admin/cta-button";

function Btn({ icon: Icon, active, disabled, onClick, title }: { icon: LucideIcon; active?: boolean; disabled?: boolean; onClick: () => void; title: string }) {
  return (
    <button type="button" title={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-30 ${active ? "bg-[#ffd716] text-[#1e1e1e]" : "text-[#6b6b6b] dark:text-white/70 hover:bg-[#f0f0f0] dark:hover:bg-white/10"}`}>
      <Icon size={16} />
    </button>
  );
}
const Divider = () => <span className="w-px h-5 bg-[#ececec] dark:bg-white/10 mx-0.5" />;

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [buttonOpen, setButtonOpen] = useState(false);

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  async function addImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    const t = toast.loading("Uploading image…");
    try { const url = await uploadFile(file, "project"); editor.chain().focus().setImage({ src: url }).run(); toast.success("Image added", { id: t }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed", { id: t }); }
  }

  /** Inserted as a ctaButton node, so it renders as a real button and stays editable. */
  function insertCta(d: ButtonDesign) {
    editor.chain().focus().insertContent({ type: CtaButton.name, attrs: d }).run();
    setButtonOpen(false);
  }

  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  return (
    <div className="flex items-center gap-0.5 flex-wrap p-2 border-b border-[#ececec] dark:border-white/10 bg-[#fafafa] dark:bg-white/[0.03] rounded-t-xl sticky top-0 z-10">
      <select value={block} onChange={(e) => {
        const v = e.target.value;
        if (v === "p") editor.chain().focus().setParagraph().run();
        else editor.chain().focus().toggleHeading({ level: v === "h2" ? 2 : 3 }).run();
      }} className="h-8 rounded-md border border-[#e3e3e3] dark:border-white/15 bg-white dark:bg-transparent text-[13px] px-2 mr-1 text-[#1e1e1e] dark:text-white focus:outline-none">
        <option value="p" className="dark:bg-[#1e1e1e]">Paragraph</option>
        <option value="h2" className="dark:bg-[#1e1e1e]">Heading 2</option>
        <option value="h3" className="dark:bg-[#1e1e1e]">Heading 3</option>
      </select>
      <Btn icon={Bold} title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn icon={Italic} title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn icon={UnderlineIcon} title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Btn icon={Strikethrough} title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Divider />
      <Btn icon={List} title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn icon={ListOrdered} title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn icon={Quote} title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Btn icon={Minus} title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <Divider />
      <Btn icon={AlignLeft} title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
      <Btn icon={AlignCenter} title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
      <Btn icon={AlignRight} title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
      <Divider />
      <Btn icon={Link2} title="Link" active={editor.isActive("link")} onClick={setLink} />
      <Btn icon={ImageIcon} title="Image" onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
      <Divider />
      <Btn icon={MousePointerClick} title="Insert a call-to-action button" onClick={() => setButtonOpen(true)} />
      <ShortcodeMenu onPick={(token) => editor.chain().focus().insertContent(token).run()} />
      <Divider />
      <Btn icon={Undo2} title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <Btn icon={Redo2} title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />

      <ButtonDialog mode="insert" open={buttonOpen} onClose={() => setButtonOpen(false)} onSubmit={insertCta} />
    </div>
  );
}

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      // openOnClick stays false so clicking a link in the editor edits rather than
      // navigating; the CTA node handles its own click by reopening the designer.
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CtaButton,
      Placeholder.configure({ placeholder: "Write your article… use the toolbar to format, add images and links." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  /**
   * Clicking the empty space below the last paragraph used to do nothing: the
   * ProseMirror element is only as tall as its content, so most of a 380px shell
   * was dead area. The document now stretches to fill the shell (see min-h-full
   * below), and this catches clicks that still land on the padding.
   */
  function focusFromShell(e: ReactMouseEvent<HTMLDivElement>) {
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (target.closest(".ProseMirror")) return; // ProseMirror will place the caret itself
    e.preventDefault();
    editor.chain().focus("end").run();
  }

  if (!editor) return <div className="rounded-xl border border-[#ececec] dark:border-white/10 h-[420px] animate-pulse bg-[#fafafa] dark:bg-white/[0.03]" />;

  return (
    <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
      <Toolbar editor={editor} />
      {/* Drag-to-resize from the bottom edge, like a textarea. `resize-y` only
          takes effect when overflow is not `visible`, hence overflow-auto; the
          min-height keeps it usable and max-height stops it being dragged past
          the viewport. Padding lives here rather than on EditorContent so the
          document itself can be full-height and take clicks anywhere. */}
      <div
        className="resize-y overflow-auto rounded-b-xl px-4 sm:px-6 py-5 cursor-text"
        style={{ minHeight: 260, height: 380, maxHeight: "80vh" }}
        onMouseDown={focusFromShell}
      >
        <EditorContent
          editor={editor}
          className="news-prose h-full [&>.ProseMirror]:min-h-full [&>.ProseMirror]:outline-none"
        />
      </div>
    </div>
  );
}
