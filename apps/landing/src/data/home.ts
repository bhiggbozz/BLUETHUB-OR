/**
 * Copy deck for the home page.
 *
 * `confirm` holds a note for anything assumed rather than known. Those notes
 * render as [CONFIRM] markers in development builds only.
 * Proof items under EXPERIENCE are drawn from work in this repository (Skoolhub);
 * everything Bluethub still needs to supply is a labelled placeholder.
 */
import {
  Compass,
  Layers,
  LifeBuoy,
  MonitorSmartphone,
  Sparkles,
  Wallet,
  WifiOff,
  Building2,
  Radio,
  Users,
  type LucideIcon,
} from "lucide-react";

export const HERO = {
  eyebrow: "Software studio · Lagos",
  eyebrowConfirm: "Is 'software studio' the right descriptor, and is Lagos the base?",
  title: "We build software that real organisations run on.",
  lede: "Bluethub designs, builds and runs digital products for schools, financial services and growing brands. Four of our own platforms are already in use, so we know what it takes long after launch day.",
  ledeConfirm: "Confirm all four products are live and in use.",
  primary: { label: "Start a project", href: "#contact" },
  secondary: { label: "See our products", href: "#products" },
  trust: "The team behind Skoolhub, QueensMoni, SABI and Cerebre Plus.",
} as const;

export interface Service {
  icon: LucideIcon;
  title: string;
  line: string;
  confirm?: string;
}

export const SERVICES_INTRO = {
  eyebrow: "What we do",
  title: "From first idea to software people rely on every day.",
  lede: "Bring us a problem, a half-built product or a blank page. We'll help you decide what to build, then build it properly.",
  action: { label: "Talk to us about your project", href: "#contact" },
  confirm: "Confirm this list of services matches what Bluethub sells.",
} as const;

export const SERVICES: Service[] = [
  {
    icon: Compass,
    title: "Product discovery",
    line: "We turn an idea into a clear scope, a tested prototype and a realistic plan before you commit a budget.",
  },
  {
    icon: MonitorSmartphone,
    title: "Web and mobile apps",
    line: "Fast, accessible apps that work on the phones and connections your customers actually have.",
  },
  {
    icon: Layers,
    title: "Multi-tenant platforms",
    line: "One platform, many organisations. Each client's data stays separate and every new roll-out stays simple.",
  },
  {
    icon: Wallet,
    title: "Fintech products",
    line: "Accounts, payments and wallets designed to earn trust from the first screen to the last transaction.",
    confirm: "Confirm Bluethub offers fintech builds to clients.",
  },
  {
    icon: Sparkles,
    title: "Practical AI",
    line: "AI for content, insight and automation, wired into the tools your team already uses. Only where it pays off.",
    confirm: "Confirm Bluethub offers AI work to clients.",
  },
  {
    icon: LifeBuoy,
    title: "Support and growth",
    line: "We stay after launch to monitor, fix and improve, so your product keeps pace with your users.",
  },
];

export interface Product {
  id: string;
  name: string;
  sector: string;
  line: string;
  points: string[];
  status: "Live" | "In development";
  /** Public URL; leave empty to hide the "Visit" link. */
  url: string;
  confirm: string;
}

export const PRODUCTS_INTRO = {
  eyebrow: "Our products",
  title: "Platforms we designed, built and still run.",
  lede: "Each one started with a real problem in a real sector. Running them ourselves keeps us honest about what good software takes.",
  action: { label: "Build something like this", href: "#contact" },
} as const;

export const PRODUCTS: Product[] = [
  {
    id: "skoolhub",
    name: "Skoolhub",
    sector: "Education",
    line: "Runs a whole school from one place, and keeps working when the internet doesn't.",
    points: [
      "Lessons recorded offline, synced later",
      "Question banks and assessments by topic",
      "Attendance and progress for parents",
    ],
    status: "Live",
    url: "",
    confirm: "Confirm Skoolhub is the public name of the school platform, its status, and its URL.",
  },
  {
    id: "queensmoni",
    name: "QueensMoni",
    sector: "Digital banking",
    line: "Everyday banking that fits in a pocket and makes sense on first use.",
    points: ["Accounts, transfers and payments", "Built mobile-first", "Security designed in from day one"],
    status: "Live",
    url: "",
    confirm: "Confirm QueensMoni's features, status, URL and whether it can be shown publicly.",
  },
  {
    id: "sabi",
    name: "SABI",
    sector: "Agencies and brands",
    line: "Lets an agency run many brands from one workspace without losing track of any of them.",
    points: ["A separate workspace per brand", "Shared assets, approvals and roles", "One view across every account"],
    status: "Live",
    url: "",
    confirm: "Confirm SABI's features, status, URL and whether it can be shown publicly.",
  },
  {
    id: "cerebre-plus",
    name: "Cerebre Plus",
    sector: "AI marketing",
    line: "Helps small marketing teams plan, write and measure like much bigger ones.",
    points: ["AI-assisted campaign planning", "Drafts in your brand's voice", "Results you can read at a glance"],
    status: "Live",
    url: "",
    confirm: "Confirm Cerebre Plus's features, status, URL and whether it can be shown publicly.",
  },
];

export interface Step {
  title: string;
  line: string;
  duration: string;
}

export const PROCESS_INTRO = {
  eyebrow: "How we work",
  title: "A clear process, with no surprises.",
  lede: "You'll always know what we're building, why, and what happens next.",
  action: { label: "Start a project", href: "#contact" },
  confirm: "Confirm the typical duration of each step.",
} as const;

export const STEPS: Step[] = [
  {
    title: "Listen",
    line: "We learn your goals, users and constraints, and agree what success looks like.",
    duration: "1–2 weeks",
  },
  {
    title: "Shape",
    line: "We prototype the key screens and fix the scope, timeline and cost before building.",
    duration: "2–3 weeks",
  },
  {
    title: "Build",
    line: "We ship in short cycles with a working demo every week. You see progress, not reports.",
    duration: "Weekly releases",
  },
  {
    title: "Launch and grow",
    line: "We release carefully, watch real usage and keep improving the product with you.",
    duration: "Ongoing",
  },
];

export interface Experience {
  icon: LucideIcon;
  title: string;
  line: string;
}

export const PROOF_INTRO = {
  eyebrow: "Experience",
  title: "Built for the conditions people actually work in.",
  lede: "Our client list is still growing. Here's what we've already shipped in production, and what it taught us.",
} as const;

/** Verified against the Skoolhub codebase in this repository. */
export const EXPERIENCE: Experience[] = [
  {
    icon: WifiOff,
    title: "Offline-first apps",
    line: "Teachers record lessons with no connection. Everything syncs when the network comes back.",
  },
  {
    icon: Building2,
    title: "Multi-tenant platforms",
    line: "Many schools on one codebase, each with its own data, roles and settings.",
  },
  {
    icon: Radio,
    title: "Live teaching and replay",
    line: "A real-time teaching whiteboard with recorded audio that students can replay later.",
  },
  {
    icon: Users,
    title: "Experiences by role",
    line: "Separate, tailored views for administrators, teachers, students and parents in one product.",
  },
];

/** Figures to supply. Shown as labelled placeholders until real numbers exist. */
export const FIGURE_PLACEHOLDERS = ["Clients served", "People using our products", "Years building software"] as const;

export const QUOTE_PLACEHOLDERS = [
  { hint: "A client quote about the outcome we delivered: one or two sentences.", who: "Name, role, organisation" },
  { hint: "A quote from someone who uses one of our products every day.", who: "Name, role, organisation" },
] as const;

export const ABOUT = {
  eyebrow: "About Bluethub",
  title: "A small team that builds for the long run.",
  story: [
    "Bluethub started with a simple frustration: too much software is designed for perfect conditions most people never see. So we build for the real ones. Patchy networks, busy people, older phones and tight budgets.",
    "Today we run our own products in education, finance and marketing, and we bring the same care to every product we build with clients.",
  ],
  storyConfirm: "Placeholder story. Replace with Bluethub's real founding story, year and team size.",
  action: { label: "Work with us", href: "#contact" },
} as const;

export const VALUES = [
  { title: "Build for real conditions", line: "We design for the network, device and day our users actually have." },
  { title: "Say it plainly", line: "Clear plans, honest estimates and no jargon, especially when the news is bad." },
  { title: "Own the outcome", line: "We measure success by what changes for your users, not by what we shipped." },
  { title: "Stay for the long run", line: "Good software is looked after. We're here after launch, not just before it." },
] as const;

export const TEAM_PLACEHOLDERS = 3;

export const CONTACT = {
  eyebrow: "Start a project",
  title: "Tell us what you're building.",
  lede: "Share a few details and we'll come back with honest next steps, even if that means we're not the right fit.",
} as const;
