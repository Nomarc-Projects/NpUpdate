"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store/auth";
import { FadeUp } from "./fade-up";

export function JoinCommunitySection() {
  const isSignedIn = useAuth((s) => s.isSignedIn);

  return (
    <FadeUp>
      <section className="bg-white dark:bg-[#111] py-20 px-6 md:px-10 lg:px-14">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-[44px] font-bold text-[#1e1e1e] dark:text-white leading-[1.08] tracking-tight mb-6">
              Join 20k+ pros sharing leads, reviews, and opportunities daily.
            </h2>
            <p className="text-[#898989] text-[15px] leading-relaxed mb-8 max-w-[440px]">
              Connect with trusted construction professionals and get direct access to construction projects or advice now!
            </p>
            {/* Where else does a signed-in member go? Straight to the Directory —
                "Join community" just keeps the label consistent across the page. */}
            {isSignedIn ? (
              <Button href="/dashboard/find-professionals" variant="primary">
                Join community
              </Button>
            ) : (
              <Button href="/signup" variant="primary">
                Join Community
              </Button>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img src="/media/join-community.webp" alt="Construction professionals collaborating" className="w-full h-full object-cover grayscale" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2/5 aspect-square rounded-full bg-[#ffd716]/85 mix-blend-multiply blur-[2px]" />
            </div>
          </div>
        </div>
      </section>
    </FadeUp>
  );
}
