import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111] relative">
      {/* Mobile-only toggle (desktop shows it inside the brand panel) */}
      <div className="lg:hidden absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
