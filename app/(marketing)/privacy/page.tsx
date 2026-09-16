import type { Metadata } from "next";
import { LegalTabs } from "@/components/marketing/legal-tabs";

export const metadata: Metadata = {
  title: "Privacy Policy — Nomarc Projects",
  description: "How Nomarc Projects collects, uses and protects your data, in line with the Nigeria Data Protection Act (NDPR).",
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

export default function PrivacyPage() {
  return (
    <div>
      <LegalTabs active="privacy" />

      <div className="max-w-[720px] mx-auto px-6 pt-16 pb-4 text-center">
        <h1 className="text-3xl md:text-[38px] font-extrabold text-[#1e1e1e] dark:text-white tracking-tight leading-tight">
          Our commitment to protecting your data and privacy
        </h1>
        <p className="mt-4 text-[#898989] dark:text-white/55 text-[15px] leading-relaxed">
          Learn more about how Nomarc Projects collects, uses, and secures your information, and your rights as a user.
        </p>
      </div>

      <div className="max-w-[760px] mx-auto px-6 pb-16">
        <p className="mt-8 text-sm text-[#9a9a9a]">Updated {UPDATED}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-[#4b4b4b] dark:text-white/70">
          Welcome to Nomarc Projects. We respect your privacy and are committed to protecting the personal and professional
          data you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you visit our website or use our services.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-[#4b4b4b] dark:text-white/70">
          By accessing or using Nomarc Projects, you agree to the practices described in this policy.
        </p>

        <Section title="1. Information We Collect">
          <p>We collect information that you provide directly to us, as well as data generated automatically when you use our platform. This includes:</p>
          <Bullets
            items={[
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Account Information:</strong> Name, email address, phone number, and password when you create an account.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Professional &amp; Corporate Profile Data:</strong> Resumes, portfolios, job history, skills, and corporate details (such as your company&apos;s RC Number for Corporate Checks).</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Identity Verification Data:</strong> Government-issued identification documents required for our Tier 2 trust and safety verification process.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Usage Data:</strong> Information about how you interact with our website, including IP addresses, browser types, device information, and pages visited.</>,
            ]}
          />
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the data we collect to operate, improve, and secure our platform. Specifically, we use your information to:</p>
          <Bullets
            items={[
              "Facilitate job postings, applications, and professional networking.",
              "Verify the identity and corporate standing of professionals and exhibitors to maintain a trusted marketplace.",
              "Process and manage promotional campaigns on the Ad Board.",
              "Communicate with you regarding account updates, platform changes, and customer support inquiries.",
              "Analyze platform usage to improve user experience and develop new features.",
            ]}
          />
        </Section>

        <Section title="3. Information Sharing and Disclosure">
          <p>We do not sell your personal data. We only share your information in the following circumstances:</p>
          <Bullets
            items={[
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">With Other Users:</strong> When you apply for a job or post a listing, relevant profile information (such as your resume or company details) is shared with the respective employer or candidate.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">With Service Providers:</strong> We may share data with trusted third-party vendors who assist us with hosting, identity verification, analytics, and customer support.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">For Legal Reasons:</strong> We may disclose your information if required to do so by law, or in response to valid requests by public authorities (e.g., a court or government agency).</>,
            ]}
          />
        </Section>

        <Section title="4. Data Security">
          <p>
            We implement industry-standard security measures to protect your personal information from unauthorized access,
            alteration, disclosure, or destruction. However, please be aware that no method of transmission over the internet
            or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="5. Your Data Rights and Choices">
          <p>Depending on your location, you have the right to:</p>
          <Bullets
            items={[
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Access and Update:</strong> Review and edit the personal information stored in your account dashboard.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Delete:</strong> Request the deletion of your account and associated personal data, subject to certain legal or operational retention requirements.</>,
              <><strong className="font-semibold text-[#1e1e1e] dark:text-white">Opt-Out:</strong> Unsubscribe from promotional emails by clicking the &ldquo;unsubscribe&rdquo; link at the bottom of our communications.</>,
            ]}
          />
        </Section>

        <Section title="6. Cookies and Tracking Technologies">
          <p>
            We use cookies and similar tracking technologies to track platform activity and store certain information. This
            helps us remember your login sessions, understand your preferences, and serve relevant industry insights and
            opportunities. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </Section>

        <Section title="7. Changes to This Privacy Policy">
          <p>
            We reserve the right to update this Privacy Policy at any time. If we make material changes, we will notify you by
            updating the &ldquo;Published&rdquo; date at the top of this policy or by sending an email notification. Continued
            use of the platform after changes implies acceptance of the updated policy.
          </p>
        </Section>

        <Section title="8. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please{" "}
            <a href="/contact" className="text-[#caa400] hover:underline">Contact us</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
