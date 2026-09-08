import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArrowLabel } from "@/components/ui/arrow-label";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold rounded-[6px] transition-colors disabled:opacity-60 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[#ffd716] text-[#1e1e1e] hover:bg-[#e6c114]",
        light: "bg-white text-[#1e1e1e] hover:bg-white/90",
        "outline-light": "border border-white/40 text-white font-semibold hover:bg-white hover:text-[#1e1e1e]",
        "outline-dark":
          "border border-[#e0e0e0] dark:border-white/15 text-[#1e1e1e] dark:text-white hover:border-[#1e1e1e] dark:hover:border-white",
      },
      size: {
        // Extra horizontal room vs. py so the arrow-label's icon (which slides
        // from the left of the text to the right on hover) never crowds
        // either edge — the label group stays centered via justify-center.
        sm: "px-6 py-2.5 text-[13px] md:text-sm",
        md: "px-8 py-3.5 text-sm md:text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type CommonProps = VariantProps<typeof buttonVariants> & {
  children: React.ReactNode;
  className?: string;
  /** Wraps children in the hover-arrow treatment (`components/ui/arrow-label.tsx`). Default true. */
  arrow?: boolean;
  /** Full-width on mobile, auto width from `sm:` up — the hero CTA-row pattern. */
  fullWidthOnMobile?: boolean;
};

type LinkProps = CommonProps & { href: string; target?: string; rel?: string; onClick?: never; type?: never; disabled?: never };
type ButtonElProps = CommonProps & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  variant,
  size,
  className,
  arrow = true,
  fullWidthOnMobile,
  href,
  ...rest
}: LinkProps | ButtonElProps) {
  const classes = cn("group", buttonVariants({ variant, size }), fullWidthOnMobile && "w-full sm:w-auto", className);
  const content = arrow ? <ArrowLabel>{children}</ArrowLabel> : children;

  if (href) {
    const { target, rel } = rest as LinkProps;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {content}
      </Link>
    );
  }

  const { onClick, type = "button", disabled } = rest as ButtonElProps;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}
