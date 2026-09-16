"use client";

import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "sonner";
import { PagePreloader } from "@/components/ui/page-preloader";
import { SessionSync } from "@/components/auth/session-sync";
import { BackToTop } from "@/components/ui/back-to-top";
import { NewsTicker } from "@/components/ui/news-ticker";
import { RouteProgress } from "@/components/ui/route-progress";
import { CartDrawer } from "@/components/exhibition-hub/cart-drawer";
import { ImpersonationProvider } from "@/lib/impersonation-context";

export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ImpersonationProvider>
          <PagePreloader />
          <RouteProgress />
          <SessionSync />
          <NewsTicker />
          {children}
          <CartDrawer />
          <BackToTop />
          <Toaster richColors position="top-right" />
        </ImpersonationProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
