/**
 * Site-wide copy and configuration for the Bluethub company site.
 *
 * Anything marked `confirm` is an assumption that needs sign-off before launch.
 * In development builds those spots show a small [CONFIRM] marker; production
 * builds hide the marker (see components/common/Confirm.tsx).
 */

export const SITE = {
  name: "Bluethub",
  /** Footer line and default social description. */
  tagline: "Software that works where you work.",
  /** Default meta description. [CONFIRM] */
  description:
    "Bluethub designs, builds and runs software for schools, financial services and growing brands. We're the team behind Skoolhub, QueensMoni, SABI and Cerebre Plus.",
  /** Canonical origin. [CONFIRM] */
  url: "https://bluethub.com",
  /** Public contact email. [CONFIRM] */
  email: "hello@bluethub.com",
  /** Where the team is based. [CONFIRM] */
  location: "Lagos, Nigeria",
  /** Typical reply time shown next to the contact form. [CONFIRM] */
  replyTime: "We reply within two working days.",
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Services", href: "/#services" },
  { label: "Products", href: "/#products" },
  { label: "How we work", href: "/#process" },
  { label: "About", href: "/#about" },
];

export const PRIMARY_CTA = { label: "Start a project", href: "/#contact" } as const;

export interface SocialLink {
  label: string;
  /** Empty until supplied; empty links are not rendered in production. [CONFIRM] */
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "LinkedIn", href: "" },
  { label: "X (Twitter)", href: "" },
  { label: "Instagram", href: "" },
];

export const FOOTER_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Company",
    links: [
      { label: "What we do", href: "/#services" },
      { label: "How we work", href: "/#process" },
      { label: "About us", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Skoolhub", href: "/#product-skoolhub" },
      { label: "QueensMoni", href: "/#product-queensmoni" },
      { label: "SABI", href: "/#product-sabi" },
      { label: "Cerebre Plus", href: "/#product-cerebre-plus" },
    ],
  },
];

/** Legal pages don't exist yet; they render as plain text until a URL is set. [CONFIRM] */
export const LEGAL_LINKS: SocialLink[] = [
  { label: "Privacy policy", href: "" },
  { label: "Terms of service", href: "" },
];
