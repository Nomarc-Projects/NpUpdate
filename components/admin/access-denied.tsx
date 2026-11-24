"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccessDenied() {
  const pathname = usePathname();
  const router = useRouter();

  // Return to dashboard on Back button click
  function goToDashboard() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-md">
        <h2 className="mt-6 text-2xl font-bold text-[#1e1e1e] dark:text-white">
          You don't have access to this page
        </h2>
        <p className="mt-4 text-[#6b6b6b] dark:text-white/60">
          You don't have the required administrator role to view this page.
        </p>
        <Button
          onClick={goToDashboard}
          className="mt-6"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}