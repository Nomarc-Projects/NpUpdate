"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store/auth";
import { FadeUp } from "./fade-up";

type StepTab = "pro" | "hire" | "exhibit";

const howItWorksData: Record<
  StepTab,
  { heading: string; tagline: string; img: string; steps: { title: string; desc: string }[] }
> = {
  pro: {
    heading: "For Professionals",
    tagline: "Your profile is your resume. Get hired in 3 simple steps.",
    img: "/media/for-professionals.webp",
    steps: [
      {
        title: "Create your profile",
        desc: "Sign up and add your bio, professional summary and experience. Verify your identity for a digital seal of credibility.",
      },
      {
        title: "Build your resume",
        desc: "Showcase your portfolio projects, skills, education and certifications, all in one place.",
      },
      {
        title: "Explore job listings",
        desc: "Browse construction opportunities, save jobs, and apply with a single click. Use our professional directory to get discovered.",
      },
    ],
  },
  hire: {
    heading: "For Employers",
    tagline: "Find the perfect candidate in 3 easy steps.",
    img: "/media/employers.webp",
    steps: [
      {
        title: "Set up your company",
        desc: "Sign up, and complete your profile so candidates can get to know you better.",
      },
      {
        title: "Post a job or search the directory",
        desc: "Detail your requirements and conditions, or browse through our verified directory.",
      },
      {
        title: "Review and contact candidates",
        desc: "Easily shortlist and reach out to the ideal employees for your team.",
      },
    ],
  },
  exhibit: {
    heading: "For Exhibitors",
    tagline: "Showcase Your Brand to the People Who Build Africa.",
    img: "/media/exhibitors.webp",
    steps: [
      {
        title: "Set up your exhibitor profile",
        desc: "Sign up and complete your company page with your brand details and contact information to establish your presence.",
      },
      {
        title: "Showcase your products and services",
        desc: "Upload product catalogs, feature your latest innovations and highlight your unique offerings to an engaged audience.",
      },
      {
        title: "Generate qualified leads",
        desc: "Reach key professionals and decision-makers through Africa's fastest-growing construction ecosystem.",
      },
    ],
  },
};

export function HowItWorksSection() {
  const [tab, setTab] = useState<StepTab>("pro");
  const data = howItWorksData[tab];
  const isSignedIn = useAuth((s) => s.isSignedIn);

  return (
    <section className="bg-white dark:bg-[#111] py-24">
      <div className="px-6 md:px-10 lg:px-14">
        {/* heading */}
        <FadeUp className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e1e1e] dark:text-white">How Nomarc works</h2>
          <p className="mt-3 text-[#898989] text-sm max-w-[440px] mx-auto leading-relaxed">
            Whether you&apos;re showcasing your skills or looking to hire top talent, Nomarc Data Gig makes it seamless.
          </p>
        </FadeUp>

        {/* tab toggle */}
        <FadeUp delay={0.1} className="flex justify-center mb-14">
          <div className="inline-flex items-center bg-[#f5f5f5] dark:bg-white/5 rounded-full p-1 gap-0 whitespace-nowrap">
            {(
              [
                ["pro", "I'm a Professional"],
                ["hire", "I'm an Employer"],
                ["exhibit", "I'm an Exhibitor"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 sm:px-7 py-2 sm:py-2.5 rounded-full text-[11.5px] sm:text-sm font-semibold transition-all duration-200 ${
                  tab === key ? "bg-[#ffd716] text-[#1e1e1e] shadow-sm" : "text-[#898989] hover:text-[#1e1e1e] dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </FadeUp>

        {/* photo + step list — equal height via items-stretch */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Left: photo */}
            <div className="rounded-2xl overflow-hidden relative min-h-[320px] md:min-h-[380px]">
              <img src={data.img} alt={data.heading} className="absolute inset-0 w-full h-full object-cover object-center" />
            </div>

            {/* Right: heading + tagline + 3-step list on a left border rail */}
            <div className="flex flex-col justify-center py-2">
              <h3 className="text-2xl md:text-[34px] font-bold text-[#1e1e1e] dark:text-white leading-tight mb-2.5">
                {data.heading}
              </h3>
              <p className="text-[#1e1e1e] dark:text-white font-semibold text-[15px] md:text-[17px] mb-8">{data.tagline}</p>

              <motion.div
                className="border-l-2 border-[#e5e5e5] dark:border-white/15 pl-6 space-y-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12, duration: 0.4 }}
              >
                {data.steps.map((step) => (
                  <div key={step.title}>
                    <h4 className="font-bold text-[15px] text-[#1e1e1e] dark:text-white mb-1.5">{step.title}</h4>
                    <p className="text-[14px] text-[#898989] dark:text-white/55 leading-relaxed max-w-[440px]">{step.desc}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* "Get started" is a sign-up CTA — nothing to start for someone who
            already has an account, so it hides rather than swapping. */}
        {!isSignedIn && (
          <FadeUp className="flex justify-center mt-14">
            <Button href="/signup" variant="primary" size="sm">
              Get started
            </Button>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
