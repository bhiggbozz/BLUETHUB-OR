/**
 * Site-wide configuration and copy for the Bluethub company site, home of Bluetsch.
 * Copy deck: apps/landing/docs/copy-deck.md. Assumptions carry a [CONFIRM] note
 * and render a marker in development builds only.
 */

export const SITE = {
  name: "Bluethub",
  tagline: "Technology that helps schools do more.",
  /** Canonical origin. [CONFIRM] */
  url: "https://bluethub.com",
  /** Public contact email. [CONFIRM] */
  email: "hello@bluethub.com",
  /** Reply-time promise. [CONFIRM] */
  replyTime: "We reply within two working days.",
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Bluetsch", href: "/#bluetsch" },
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Security", href: "/#security" },
  { label: "Pilot", href: "/#pilot" },
  { label: "FAQ", href: "/#faq" },
];

export const PRIMARY_CTA = { label: "Book a demo", href: "/#demo" } as const;

export interface ExternalLink {
  label: string;
  /** Empty until supplied; empty links render as text, never as dead links. [CONFIRM] */
  href: string;
}

export const SOCIAL_LINKS: ExternalLink[] = [
  { label: "LinkedIn", href: "" },
  { label: "X (Twitter)", href: "" },
  { label: "Instagram", href: "" },
];

export const FOOTER_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Bluetsch",
    links: [
      { label: "Overview", href: "/#bluetsch" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Roadmap", href: "/#roadmap" },
      { label: "Security", href: "/#security" },
      { label: "Pilot", href: "/#pilot" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Book a demo", href: "/#demo" },
      { label: "Start your pilot", href: "/#pilot" },
      { label: "Email us", href: `mailto:${SITE.email}` },
    ],
  },
];

export const LEGAL_LINKS: ExternalLink[] = [
  { label: "Privacy policy", href: "" },
  { label: "Terms of service", href: "" },
];
