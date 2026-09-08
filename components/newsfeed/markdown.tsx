import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders post markdown with on-brand prose styling (server-compatible). */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => <h1 className="text-3xl font-bold text-[#1e1e1e] dark:text-white mt-12 mb-4" {...p} />,
        h2: (p) => <h2 className="text-2xl md:text-[26px] font-bold text-[#1e1e1e] dark:text-white mt-12 mb-4" {...p} />,
        h3: (p) => <h3 className="text-xl font-bold text-[#1e1e1e] dark:text-white mt-8 mb-3" {...p} />,
        p: (p) => <p className="text-[#6b6b6b] dark:text-white/70 leading-relaxed mb-4" {...p} />,
        ul: (p) => <ul className="list-disc pl-6 space-y-1.5 mb-4 text-[#6b6b6b] dark:text-white/70" {...p} />,
        ol: (p) => <ol className="list-decimal pl-6 space-y-1.5 mb-4 text-[#6b6b6b] dark:text-white/70" {...p} />,
        li: (p) => <li className="leading-relaxed" {...p} />,
        a: (p) => <a className="text-[#caa400] hover:underline" target="_blank" rel="noopener noreferrer" {...p} />,
        strong: (p) => <strong className="font-semibold text-[#1e1e1e] dark:text-white" {...p} />,
        blockquote: (p) => <blockquote className="border-l-4 border-[#ffd716] pl-4 italic text-[#6b6b6b] dark:text-white/70 my-6" {...p} />,
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        img: (p) => <img className="rounded-xl my-6 w-full" {...p} />,
        code: (p) => <code className="bg-[#f4f4f4] dark:bg-white/10 rounded px-1.5 py-0.5 text-[0.9em]" {...p} />,
        hr: () => <hr className="my-8 border-[#ececec] dark:border-white/10" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
