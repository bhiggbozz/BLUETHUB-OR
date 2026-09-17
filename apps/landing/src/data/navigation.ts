export const SITE_CONFIG = {
  name: "Bluethub",
  tagline: "Learn. Grow. Thrive.",
  description:
    "Bluethub connects schools, teachers, students and parents on one powerful platform — with offline-first tools, intelligent question banks, and real-time progress monitoring.",
  url: "https://bluethub.com",
} as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Who it's for", href: "#roles" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO_STATS = [
  { value: "10k+", label: "Students enrolled" },
  { value: "500+", label: "Schools registered" },
  { value: "98%", label: "Teacher satisfaction" },
] as const;

export const TRUST_PARTNERS = [
  "Edo EdTech Initiative",
  "FCT Schools",
  "Rivers State Board",
  "Oyo EdHub",
] as const;

export const BAND_PILLS = [
  "Agriculture Portal",
  "Health & Wellness",
  "Vocational Training",
] as const;

export const FOOTER_LINKS = {
  platform: [
    { label: "E-Learning", href: "#" },
    { label: "Question Bank", href: "#" },
    { label: "Parent Portal", href: "#" },
    { label: "School Admin", href: "#" },
    { label: "Coming soon", href: "#" },
  ],
  company: [
    { label: "About us", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
  ],
  support: [
    { label: "Help centre", href: "#" },
    { label: "Contact us", href: "#" },
    { label: "WhatsApp", href: "#" },
    { label: "System status", href: "#" },
  ],
} as const;
