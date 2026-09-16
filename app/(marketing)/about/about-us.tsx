"use client";

import { useState } from "react";
import Link from "next/link";
import { Linkedin, Instagram, Facebook, HardHat, Building2, Handshake } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ArrowLabel } from "@/components/ui/arrow-label";
import { CircularText } from "@/components/ui/circular-text";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";
import type { AboutTeamSetting } from "@/lib/services/platform-settings-shared";

/* ─── data ──────────────────────────────────────────────────────────────── */

const IMG = "/media/about";

const HERO_BODY = [
  "Nigeria cannot close its housing deficit, deliver the infrastructure required for economic growth, or significantly reduce building failures without first empowering the professionals responsible for designing, constructing, and managing our built environment.",
  "Nomarc Projects exists to solve that challenge.",
  "We are building Africa's leading digital ecosystem for the construction industry, a platform that connects construction professionals, employers, manufacturers, suppliers, and project stakeholders into one trusted network where opportunities, knowledge, technology, and business can thrive.",
  "Our vision goes far beyond recruitment. We are creating the digital infrastructure that powers the entire lifecycle of construction projects.",
];

const STORY_EFFECTS = [
  "Projects experienced delays.",
  "Construction costs increased.",
  "Professionals remained underemployed.",
  "National development slowed.",
];

/** Mission / Vision share a layout; Core Values renders its own grid. */
const PURPOSE_TABS = [
  {
    label: "Our Mission",
    img: `${IMG}/mission.webp`,
    alt: "Hand placing a dart in the centre of a target",
    lead: "To empower construction professionals with opportunities, technology, knowledge, and trusted connections",
    trail: "that improve project delivery while accelerating Africa's built environment.",
  },
  {
    label: "Our Vision",
    img: `${IMG}/vision.webp`,
    alt: "Site engineer looking through binoculars",
    lead: "To become Africa's most trusted digital infrastructure for the construction industry,",
    trail: "enabling millions of professionals and businesses to build safer, faster, smarter, and more sustainable communities.",
  },
  { label: "Our Core Values" },
] as const;

const CORE_VALUES = [
  { title: "Excellence",    body: "We pursue the highest standards in everything we build." },
  { title: "Integrity",     body: "Trust is the foundation of every professional relationship." },
  { title: "Innovation",    body: "We embrace technology to solve real industry problems." },
  { title: "Collaboration", body: "Great projects are built by connected teams." },
  { title: "Impact",        body: "Every feature we develop is designed to improve lives and strengthen the construction industry." },
];

const WHAT_WE_DO = [
  {
    label: "Professional Opportunities",
    body: "Connecting verified professionals directly with employers, consultants, developers, contractors, and project owners.",
    img: `${IMG}/do-1.webp`,
    alt: "Construction professional checking their phone on site",
  },
  {
    label: "Industry Exhibition Hub",
    body: "Helping manufacturers, suppliers, distributors, and service providers showcase innovative products and solutions to thousands of verified construction professionals.",
    img: `${IMG}/do-2.webp`,
    alt: "Exhibition hall filled with trade stands",
  },
  {
    label: "Professional Practice Tools",
    body: "Digital templates, resources, AI-powered assistants, and workflow solutions that improve productivity across every construction discipline.",
    img: `${IMG}/do-3.webp`,
    alt: "Hand on a mouse beside a laptop",
  },
  {
    label: "Project Collaboration",
    body: "Technology that enables teams to communicate, manage projects, monitor progress, and collaborate more effectively from concept to completion.",
    img: `${IMG}/do-4.webp`,
    alt: "Site team in high-visibility vests reviewing work together",
  },
  {
    label: "Industry Community",
    body: "A growing network where professionals learn, share opportunities, build relationships, and develop their careers.",
    img: `${IMG}/do-5.webp`,
    alt: "Construction professional with a tablet among a crowd",
  },
];

const WHO_WE_SERVE = [
  {
    icon: HardHat,
    title: "Construction Professionals",
    body: "Architects, Engineers, Builders, Quantity Surveyors, Estate Surveyors & Valuers, Urban Planners, Project Managers, Facility Managers, Land Surveyors, Interior Designers, Environmental Professionals, Artisans and Skilled Trades, Students and Young Professionals",
  },
  {
    icon: Building2,
    title: "Employers",
    body: "Construction Companies, Real Estate Developers, Consultancy Firms, Government Agencies, Facility Management Companies, Manufacturing Companies, Infrastructure Firms, Project Owners, Recruitment Partners",
  },
  {
    icon: Handshake,
    title: "Industry Partners",
    body: "Building Material Manufacturers, Equipment Suppliers, Technology Companies, Financial Institutions, Insurance Companies, Professional Associations, Educational Institutions, Industry Organizations",
  },
];

const IMPACT_BODY = [
  "Since launching our MVP, Nomarc Projects has grown into a trusted community of more than 2,000 verified construction professionals and industry stakeholders.",
  "Our platform has already facilitated employment opportunities ranging from internships and graduate placements to experienced professional roles, while helping employers connect with qualified talent more efficiently.",
  "Every new connection strengthens the industry's capacity to deliver better projects.",
];

/* The team roster lives in the `about_team` platform setting (super-admin
 * editable); the baked-in counterpart lives in ABOUT_TEAM_DEFAULT in
 * lib/services/platform-settings-shared.ts. Rendering is driven entirely by the
 * prop below so an admin edit (or a hide/ship flip) is the single source. */

/* ─── helpers ────────────────────────────────────────────────────────────── */

function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/** Rotating "ABOUT US · NOMARC PROJECTS" seal that sits under the hero headline. */
function RotatingSeal() {
  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#fdeeb0] dark:bg-[#ffd716]/15 ring-2 ring-[#ffd716] flex items-center justify-center">
      <CircularText
        text="ABOUT US • NOMARC PROJECTS • "
        spinDuration={18}
        onHover="speedUp"
        fontSize={10}
        className="absolute inset-[9px] text-[#1e1e1e] dark:text-white"
      />
      <span className="relative w-6 h-6 rounded-full bg-[#ffd716] ring-4 ring-[#ffd716]/40 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-[#1e1e1e]" />
      </span>
    </div>
  );
}

const eyebrow = "text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a9a9a] dark:text-white/40";
const body = "text-[14.5px] leading-relaxed text-[#6b6b6b] dark:text-white/55";
const rule = "border-t border-[#ececec] dark:border-white/10";

/* ─── main component ─────────────────────────────────────────────────────── */

export function AboutUs({ team }: { team: AboutTeamSetting }) {
  return (
    <div className="bg-white dark:bg-[#111]">

      {/* ══ 1. HERO ══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 pt-14 pb-10">
        <div className="max-w-[1180px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16">
          <Reveal>
            <div>
              <p className={cn(eyebrow, "mb-4")}>About Nomarc Projects</p>
              <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-[#1e1e1e] dark:text-white">
                Building the Digital Infrastructure for Africa&apos;s Construction Industry
              </h1>
              <div className="mt-10 flex justify-center lg:justify-start lg:pl-10">
                <RotatingSeal />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-5 lg:pt-10">
              {HERO_BODY.map((p) => <p key={p} className={body}>{p}</p>)}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="max-w-[1180px] mx-auto mt-14">
          <div className="rounded-3xl overflow-hidden aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}/hero.webp`} alt="Crane lifting steel over a building under construction" className="w-full h-full object-cover" />
          </div>
        </Reveal>
      </section>

      {/* ══ 2. OUR STORY ═════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 py-16">
        <div className="max-w-[1180px] mx-auto">
          <Reveal>
            <div className="text-center max-w-[620px] mx-auto mb-10">
              <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">Our Story</h2>
              <p className={cn(body, "mt-3")}>
                Nomarc Projects was founded after discovering a simple but costly problem within the construction industry.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            <Reveal className="h-full">
              <div className="h-full rounded-3xl bg-[#1e1e1e] border border-transparent dark:border-white/10 p-7 flex flex-col justify-center">
                <p className="text-[13.5px] leading-relaxed text-white/55">
                  While employers constantly struggled to find qualified professionals within project locations,{" "}
                  <span className="font-semibold text-white">
                    thousands of skilled architects, engineers, quantity surveyors, surveyors, project managers, artisans, and other construction professionals
                  </span>{" "}
                  remained unemployed, not because they lacked competence, but because there was no efficient system connecting them to the right opportunities.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.05} className="h-full">
              <div className="h-full min-h-[260px] rounded-3xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/story.webp`} alt="Construction worker in an orange helmet using a phone" className="w-full h-full object-cover" />
              </div>
            </Reveal>

            <Reveal delay={0.1} className="h-full">
              <div className="h-full rounded-3xl bg-[#ffd716] p-7 flex flex-col justify-center">
                <p className="text-[13.5px] font-semibold text-[#1e1e1e]">This disconnect affected everyone.</p>
                <ul className="mt-3 space-y-1.5">
                  {STORY_EFFECTS.map((e) => (
                    <li key={e} className="flex gap-2 text-[13px] leading-relaxed text-[#1e1e1e]/80">
                      <span className="mt-[7px] w-1 h-1 rounded-full bg-[#1e1e1e]/60 flex-shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[13px] leading-relaxed text-[#1e1e1e]/80">
                  Rather than treating these as isolated problems, we identified them as symptoms of one missing system.
                </p>
                <p className="mt-3 text-[13px] font-bold leading-relaxed text-[#1e1e1e]">
                  Nomarc Projects was created to become that system.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ 3. MISSION / VISION / CORE VALUES ════════════════════════════════ */}
      <PurposeTabs />

      {/* ══ 4. WHAT WE DO ════════════════════════════════════════════════════ */}
      <WhatWeDo />

      {/* ══ 5. WHO WE SERVE ══════════════════════════════════════════════════ */}
      <section className="bg-[#1e1e1e] px-6 md:px-10 lg:px-14 py-20">
        <div className="max-w-[1180px] mx-auto">
          <Reveal>
            <p className={cn(eyebrow, "text-white/40 mb-4")}>Who we serve</p>
            <h2 className="text-[clamp(1.7rem,3.6vw,2.7rem)] font-bold leading-[1.2] tracking-tight text-white max-w-[820px]">
              Nomarc Projects is built for the <span className="text-[#ffd716]">entire construction ecosystem.</span>
            </h2>
          </Reveal>

          <div className="mt-10 space-y-4">
            {WHO_WE_SERVE.map((g, i) => (
              <Reveal key={g.title} delay={i * 0.06}>
                <div className="group rounded-2xl border border-white/10 p-6 sm:p-7 flex gap-5 transition-colors hover:border-[#ffd716]">
                  <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#ffd716]/10 flex items-center justify-center transition-colors group-hover:bg-[#ffd716]/20">
                    <g.icon size={22} className="text-[#ffd716]" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="text-[15.5px] font-bold text-white">{g.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/50">{g.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6. OUR IMPACT ════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 py-20">
        <div className="max-w-[1180px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div>
              <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">Our Impact</h2>
              <div className="mt-5 space-y-4">
                {IMPACT_BODY.map((p) => <p key={p} className={body}>{p}</p>)}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-3xl overflow-hidden aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${IMG}/impact.webp`} alt="Silhouette of a construction worker overlaid with a building site" className="w-full h-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 7. WHY NOMARC MATTERS ════════════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 py-16">
        <div className="max-w-[1180px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-3xl overflow-hidden aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${IMG}/why.webp`} alt="Professional working at a laptop over building drawings" className="w-full h-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.08} className="order-1 lg:order-2">
            <div>
              <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">Why Nomarc Matters</h2>
              <div className="mt-5 space-y-4">
                <p className={body}>Construction is one of the world&apos;s largest industries, yet many of its processes remain fragmented. Information is scattered.</p>
                <p className={body}>Opportunities are difficult to access. Businesses struggle to reach their target audience. Professionals often rely on personal networks rather than transparent systems.</p>
                <p className="text-[14.5px] leading-relaxed font-semibold text-[#1e1e1e] dark:text-white">Nomarc Projects is replacing fragmentation with connection.</p>
                <p className={body}>By digitizing relationships across the construction value chain, we enable better collaboration, faster decision-making, increased accountability, and stronger business growth.</p>
                <p className={body}>When professionals succeed, projects succeed. When projects succeed, communities prosper.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 8. BUILDING BEYOND PROJECTS ══════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 py-16">
        <div className={cn("max-w-[1180px] mx-auto pt-14", rule)}>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <Reveal>
              <div>
                <p className={cn(eyebrow, "mb-4")}>Building beyond projects</p>
                <h2 className="text-[clamp(1.6rem,3.2vw,2.4rem)] font-bold leading-[1.2] tracking-tight text-[#1e1e1e] dark:text-white">
                  We believe construction is ultimately about people.
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="space-y-4">
                <p className={body}>Behind every building is a professional seeking opportunity. Behind every project is a team solving problems.</p>
                <p className={body}>Behind every community is infrastructure that shapes lives. Nomarc Projects exists to strengthen the people who build our world.</p>
                <p className="text-[14.5px] leading-relaxed font-semibold text-[#1e1e1e] dark:text-white">
                  Together, we are creating a more connected, productive, and prosperous construction industry for Africa.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ 9. THE MINDS BEHIND NOMARC ═══════════════════════════════════════ */}
      {team.enabled && (
        <section className="px-6 md:px-10 lg:px-14 py-16">
          <div className={cn("max-w-[1180px] mx-auto pt-14", rule)}>
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
                <div className="max-w-[620px]">
                  <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">
                    {team.heading}
                  </h2>
                  <p className={cn(body, "mt-3")}>{team.subtitle}</p>
                </div>
                <p className={cn(eyebrow, "whitespace-nowrap")}>{team.eyebrow}</p>
              </div>
            </Reveal>

            {team.members.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                {team.members.map((m, i) => (
                  <TeamCard key={m.name} {...m} delay={i * 0.06} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ 10. JOIN THE MOVEMENT ════════════════════════════════════════════ */}
      <section className="px-6 md:px-10 lg:px-14 pb-20">
        <div className="max-w-[1180px] mx-auto relative rounded-[28px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/cta.webp`} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 px-6 py-20 sm:py-24 text-center">
            <Reveal>
              <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold text-[#ffd716] tracking-tight">
                Join the movement
              </h2>
              <p className="mt-4 mx-auto max-w-[620px] text-[14px] leading-relaxed text-white/75">
                Whether you are a professional looking for opportunities, an employer searching for talent, a manufacturer
                expanding your market, or an organization committed to advancing the built environment, Nomarc Projects is
                your trusted partner.
              </p>
              <p className="mt-4 mx-auto max-w-[560px] text-[14px] leading-relaxed text-white/75">
                Build your career. Grow your business. Shape the future of Africa&apos;s construction industry with Nomarc Projects.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center bg-[#ffd716] text-[#1e1e1e] font-bold px-7 py-3 rounded-xl text-[14px] hover:bg-[#e6c114] transition-colors"
                >
                  <ArrowLabel size={16}>Get started</ArrowLabel>
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-white text-[#1e1e1e] font-semibold px-7 py-3 rounded-xl text-[14px] hover:bg-white/85 transition-colors"
                >
                  Join community
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ─── mission / vision / core values ─────────────────────────────────────── */

/**
 * Mission / Vision / Core Values, as three tabs. Only the selected panel
 * renders; the label row is the switcher.
 *
 * The large two-tone statement uses ScrollReveal, keyed on the active tab so a
 * tab change remounts it and its ScrollTrigger recomputes against the new
 * panel's position — without the key it would keep the previous panel's scrub
 * progress and the words could stay stuck at their faded start state.
 */
function PurposeTabs() {
  const [active, setActive] = useState(0);
  const tab = PURPOSE_TABS[active];

  return (
    <section className="px-6 md:px-10 lg:px-14 py-16">
      <div className="max-w-[1180px] mx-auto">
        <div role="tablist" aria-label="Our purpose" className="grid grid-cols-3 gap-4 sm:gap-6">
          {PURPOSE_TABS.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              id={`purpose-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`purpose-panel-${i}`}
              onClick={() => setActive(i)}
              className={cn(
                "text-left pb-2.5 text-[9.5px] sm:text-[10.5px] md:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] border-b transition-colors",
                i === active
                  ? "text-[#1e1e1e] dark:text-white border-[#1e1e1e] dark:border-white"
                  : "text-[#9a9a9a] dark:text-white/40 border-[#e3e3e3] dark:border-white/10 hover:text-[#1e1e1e] dark:hover:text-white/70",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`purpose-panel-${active}`} aria-labelledby={`purpose-tab-${active}`} className="mt-10 md:mt-12">
          {"img" in tab ? (
            <div className="grid md:grid-cols-[minmax(0,340px)_1fr] gap-6 md:gap-10 lg:gap-14 items-start">
              <Reveal>
                <div className="rounded-2xl overflow-hidden aspect-[7/6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tab.img} alt={tab.alt} className="w-full h-full object-cover" />
                </div>
              </Reveal>
              <ScrollReveal
                key={tab.label}
                as="p"
                trail={tab.trail}
                baseRotation={0}
                baseOpacity={0.12}
                blurStrength={4}
                // Sized off the reference: line pitch ~1.5x the font, so four
                // lines of the statement stand about half the image's height and
                // the two columns read at the same visual scale.
                containerClassName="text-[clamp(1.3rem,2.7vw,1.95rem)] font-bold leading-[1.5] tracking-tight text-[#1e1e1e] dark:text-white"
                trailClassName="text-[#9a9a9a] dark:text-white/40"
              >
                {tab.lead}
              </ScrollReveal>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {CORE_VALUES.map((v, i) => (
                <Reveal
                  key={v.title}
                  delay={i * 0.05}
                  className={i === CORE_VALUES.length - 1 ? "sm:col-span-2" : undefined}
                >
                  <div className="h-full rounded-xl border border-[#f3e6b0] dark:border-[#ffd716]/25 bg-[#fdf6e0] dark:bg-[#ffd716]/[0.06] px-5 py-4 sm:py-5 text-center transition-colors hover:border-[#ffd716]">
                    <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-[#1e1e1e] dark:text-white">{v.title}</h3>
                    <p className="mt-1 text-[12.5px] sm:text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">{v.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── what we do ─────────────────────────────────────────────────────────── */

function WhatWeDo() {
  const [active, setActive] = useState(0);

  return (
    <section className="px-6 md:px-10 lg:px-14 py-16">
      <div className="max-w-[1180px] mx-auto">
        <Reveal>
          <p className={cn(eyebrow, "mb-4")}>What we do</p>
          <ScrollReveal
            trail="Our platform provides:"
            baseRotation={0}
            baseOpacity={0.1}
            blurStrength={4}
            containerClassName="text-[clamp(1.6rem,3.4vw,2.5rem)] font-bold leading-[1.25] tracking-tight text-[#1e1e1e] dark:text-white"
            trailClassName="text-[#9a9a9a] dark:text-white/40"
          >
            Nomarc Projects is developing an integrated ecosystem where every stakeholder within the construction value chain can work more efficiently.
          </ScrollReveal>
        </Reveal>

        {/* Pill rail. Wraps rather than scrolling sideways: all five fit on one
            row at desktop width and fold onto further rows as it narrows, so no
            pill is ever parked off-screen behind a scroll nobody notices. */}
        <Reveal delay={0.06} className="mt-10">
          <div
            role="tablist"
            aria-label="What we do"
            className="rounded-2xl border border-[#ececec] dark:border-white/10 p-2 sm:p-3 flex flex-wrap gap-2 sm:gap-4"
          >
            {WHAT_WE_DO.map((t, i) => (
              <button
                key={t.label}
                role="tab"
                id={`wwd-tab-${i}`}
                aria-selected={i === active}
                aria-controls={`wwd-panel-${i}`}
                onClick={() => setActive(i)}
                className={cn(
                  // flex-auto: each pill starts at its text width and shares the
                  // leftover space, so the row fills the container edge to edge
                  // instead of trailing off. Wrapped rows on mobile fill too.
                  "flex-auto whitespace-nowrap rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium border transition-colors",
                  i === active
                    ? "bg-[#ffd716] border-[#ffd716] text-[#1e1e1e] font-semibold"
                    : "bg-white dark:bg-transparent border-[#e6e6e6] dark:border-white/15 text-[#6b6b6b] dark:text-white/55 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Only the selected panel renders — the rail is a tab switcher. */}
        <div
          key={active}
          role="tabpanel"
          id={`wwd-panel-${active}`}
          aria-labelledby={`wwd-tab-${active}`}
          className="mt-10 grid md:grid-cols-2 gap-6 lg:gap-12 items-center"
        >
          <Reveal>
            <div>
              <h3 className="text-[clamp(1.15rem,2.2vw,1.6rem)] font-bold tracking-tight text-[#1e1e1e] dark:text-white">
                {WHAT_WE_DO[active].label}
              </h3>
              <p className={cn(body, "mt-3 max-w-[420px]")}>{WHAT_WE_DO[active].body}</p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="rounded-2xl overflow-hidden aspect-[16/10] md:aspect-[2/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={WHAT_WE_DO[active].img} alt={WHAT_WE_DO[active].alt} className="w-full h-full object-cover" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── team card ──────────────────────────────────────────────────────────── */

/** Every icon sits white until you point at it — the yellow one in the design is
 *  a hover state on that single icon, not a permanently accented first item. */
const SOCIALS = [
  { label: "X",         el: <XIcon size={15} /> },
  { label: "LinkedIn",  el: <Linkedin size={16} /> },
  { label: "Instagram", el: <Instagram size={16} /> },
  { label: "Facebook",  el: <Facebook size={16} /> },
];

function TeamCard({ name, role, img, delay }: { name: string; role: string; img: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group">
        {/* 23:25, measured off the reference. The original 4:5 ran too tall and
            cropped the portraits at the chin on narrow screens. */}
        <div className="relative rounded-3xl overflow-hidden aspect-[23/25] bg-[#f4f4f4] dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={name} className="w-full h-full object-cover" />
          {/* Social rail: hidden until the card is hovered, then slides in on the
              right edge. Sizes step down with the card so four circles still fit
              inside the photo at the two-column mobile layout. */}
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 sm:gap-2.5 opacity-0 translate-x-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 focus-within:opacity-100 focus-within:translate-x-0">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={`${name} on ${s.label}`}
                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-white text-[#1e1e1e] flex items-center justify-center shadow-sm transition-colors hover:bg-[#ffd716] focus-visible:bg-[#ffd716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {s.el}
              </a>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[13.5px] sm:text-[15px] font-bold text-[#1e1e1e] dark:text-white">{name}</p>
        <p className="text-[11.5px] sm:text-[12.5px] text-[#9a9a9a] dark:text-white/45">{role}</p>
      </div>
    </Reveal>
  );
}
