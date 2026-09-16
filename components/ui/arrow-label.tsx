import { ArrowRight } from "lucide-react";

/**
 * Button label whose arrow eases from the LEFT of the text to the RIGHT on
 * hover. Put `group` on the parent button. No layout shift (arrows are
 * absolutely positioned just outside the text, so the label stays centered).
 */
export function ArrowLabel({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center px-1">
      <ArrowRight
        size={size}
        className="absolute right-full mr-0.5 opacity-100 transition-all duration-300 ease-in group-hover:opacity-0 group-hover:translate-x-2"
      />
      <span>{children}</span>
      <ArrowRight
        size={size}
        className="absolute left-full ml-0.5 opacity-0 -translate-x-2 transition-all duration-300 ease-in group-hover:opacity-100 group-hover:translate-x-0"
      />
    </span>
  );
}
