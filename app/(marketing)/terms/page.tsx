import type { Metadata } from "next";
import { LegalTabs } from "@/components/marketing/legal-tabs";

export const metadata: Metadata = {
  title: "Terms of Service — Nomarc Projects",
  description: "The terms governing your use of the Nomarc Projects marketplace.",
};

const UPDATED = "July 10, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#1e1e1e] dark:text-white">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-[#4b4b4b] dark:text-white/70">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="pl-4 relative">
          <span className="absolute left-0 top-[10px] w-1.5 h-1.5 rounded-full bg-[#d4d4d4] dark:bg-white/25" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <div>
      <LegalTabs active="terms" />

      <div className="max-w-[720px] mx-auto px-6 pt-16 pb-4 text-center">
        <h1 className="text-3xl md:text-[38px] font-extrabold text-[#1e1e1e] dark:text-white tracking-tight leading-tight">
          Our commitment to maintaining a fair, transparent, and secure platform
        </h1>
        <p className="mt-4 text-[#898989] dark:text-white/55 text-[15px] leading-relaxed">
          Everything you need to know about how our platform operates and what we expect from our users.
        </p>
      </div>

      <div className="max-w-[760px] mx-auto px-6 pb-16">
        <p className="mt-8 text-sm text-[#9a9a9a]">Updated {UPDATED}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-[#4b4b4b] dark:text-white/70">
          Welcome to Nomarc Projects. By accessing or using our website and services, you agree to comply with and be bound by the
          following Terms and Conditions. If you do not agree, please do not use our services.
        </p>

        <Section title="1. Acceptance of Terms">
          <p>By registering, accessing, or using our platform, you agree to these Terms and Conditions and our Privacy Policy.</p>
        </Section>

        <Section title="2. Services Offered">
          <p>Nomarc Projects provides a professional networking space for architects, engineers, and other field professionals. Our services include but are not limited to:</p>
          <Bullets
            items={[
              "Job postings and job searches.",
              "Connecting professionals with employers.",
              "Showcasing young talents in the industry.",
              "Providing tools for collaboration and networking. We reserve the right to modify or discontinue any part of our services at any time.",
            ]}
          />
        </Section>

        <Section title="3. User Accounts">
          <Bullets
            items={[
              "You must provide accurate and complete information when creating an account.",
              "You are responsible for maintaining the confidentiality of your account credentials.",
              "We reserve the right to suspend or terminate accounts that violate our policies.",
            ]}
          />
        </Section>

        <Section title="4. User Conduct">
          <p>By using our platform, you agree not to:</p>
          <Bullets
            items={[
              "Use the services for any unlawful purposes.",
              "Upload or share harmful, misleading, or offensive content.",
              "Violate the rights of other users or third parties.",
              "Attempt to gain unauthorized access to our system.",
              "Engage in fraudulent activities, including fake job postings or misleading talent representation.",
            ]}
          />
        </Section>

        <Section title="5. Privacy Policy">
          <p>Your use of the platform is also governed by our Privacy Policy, which outlines how we collect, use, and protect your data.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>All content on our platform, including text, logos, graphics, and software, is the property of Nomarc Projects or its licensors and is protected by intellectual property laws. You may not copy, modify, or distribute any content without permission.</p>
        </Section>

        <Section title="7. Job Posting and Hiring Practices">
          <Bullets
            items={[
              "Employers must provide accurate job descriptions and requirements.",
              "False, misleading, or discriminatory job postings are prohibited.",
              "Professionals applying for jobs must provide truthful information about their skills and experience.",
              "The platform is not responsible for any employment agreements, contracts, or disputes between employers and professionals.",
            ]}
          />
        </Section>

        <Section title="8. Limitation of Liability">
          <p>Nomarc Projects acts as a platform that connects professionals, employers, and exhibitors. We are not a party to any agreement, contract, or transaction between users, and are not responsible for the conduct of any user. To the extent permitted by law, Nomarc is not liable for any disputes, losses, or damages arising from interactions on the platform, which is provided on an &ldquo;as is&rdquo; basis.</p>
        </Section>

        <Section title="9. Termination">
          <p>You may close your account at any time from Settings. We may suspend or terminate access for breaches of these terms, including fraudulent listings, harassment, or attempts to compromise the security of the platform.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>We reserve the right to update these Terms and Conditions at any time. Continued use of our platform after changes implies acceptance of the updated terms.</p>
        </Section>

        <Section title="11. Contact Information">
          <p>
            If you have any questions regarding these Terms and Conditions, please{" "}
            <a href="/contact" className="text-[#caa400] hover:underline">Contact us</a>.
          </p>
          <p>By using Nomarc Projects, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.</p>
        </Section>
      </div>
    </div>
  );
}
