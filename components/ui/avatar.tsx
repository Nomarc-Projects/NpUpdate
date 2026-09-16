"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs:   "h-6  w-6  text-[9px]",
        sm:   "h-8  w-8  text-[10px]",
        md:   "h-10 w-10 text-xs",
        lg:   "h-12 w-12 text-sm",
        xl:   "h-16 w-16 text-base",
        "2xl":"h-20 w-20 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const DOT_SIZE: Record<string, string> = {
  xs:   "h-1.5 w-1.5",
  sm:   "h-2   w-2",
  md:   "h-2.5 w-2.5",
  lg:   "h-3   w-3",
  xl:   "h-3.5 w-3.5",
  "2xl":"h-4   w-4",
};
const BADGE_SIZE: Record<string, string> = {
  xs:   "h-3   w-3",
  sm:   "h-3.5 w-3.5",
  md:   "h-4   w-4",
  lg:   "h-5   w-5",
  xl:   "h-6   w-6",
  "2xl":"h-7   w-7",
};

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface NomarcAvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  name?: string | null;
  online?: boolean;
  verified?: boolean;
  notification?: number;
  imgClassName?: string;
  fallbackClassName?: string;
}

export function NomarcAvatar({
  src,
  name,
  online,
  verified,
  notification,
  size = "md",
  className,
  imgClassName,
  fallbackClassName,
  ...props
}: NomarcAvatarProps) {
  const sz = (size ?? "md") as string;
  const hasBothBadges = online && verified;

  return (
    <span className="relative inline-flex shrink-0" {...props}>
      <AvatarPrimitive.Root
        className={cn(avatarVariants({ size }), className)}
      >
        <AvatarPrimitive.Image
          src={src ?? undefined}
          alt={name ?? "User"}
          className={cn("aspect-square h-full w-full object-cover", imgClassName)}
        />
        <AvatarPrimitive.Fallback
          delayMs={0}
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full font-semibold",
            // One solid fill in both themes. This was a tinted wash with a
            // separate ink colour (and a different pairing again in dark), so
            // the placeholder read as two colours and shifted between modes.
            "bg-[#b89a00] text-white",
            fallbackClassName
          )}
        >
          {getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {/* Online indicator */}
      {online && (
        <span
          className={cn(
            "absolute rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111]",
            DOT_SIZE[sz],
            hasBothBadges ? "bottom-0 left-0" : "bottom-0 right-0"
          )}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
        </span>
      )}

      {/* Verified badge */}
      {verified && (
        <span
          className={cn(
            "absolute bottom-0 right-0 flex items-center justify-center rounded-full",
            "bg-blue-500 ring-2 ring-white dark:ring-[#111]",
            BADGE_SIZE[sz]
          )}
        >
          <Check
            strokeWidth={3}
            className="h-[55%] w-[55%] text-white"
          />
        </span>
      )}

      {/* Notification count */}
      {notification !== undefined && notification > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#111]">
          {notification > 99 ? "99+" : notification}
        </span>
      )}
    </span>
  );
}

/* ── Low-level primitives re-exported for cases that need them ─────────── */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-secondary text-xs font-medium",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
