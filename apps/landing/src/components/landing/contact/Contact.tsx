import { Clock, Mail, MapPin } from "lucide-react";
import { CONTACT } from "@/data/home";
import { SITE } from "@/data/site";
import { Confirm } from "@/components/common/Confirm";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { ContactForm } from "./ContactForm";

/** Final CTA band and contact form, on the dark "ink" surface. */
export function Contact() {
  return (
    <Section id="contact" tone="ink" labelledBy="contact-title" className="overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
      />
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-blue-200">{CONTACT.eyebrow}</p>
          <h2 id="contact-title" className="text-h1 mt-4 text-ink-foreground">
            {CONTACT.title}
          </h2>
          <p className="text-lede mt-6 text-ink-muted">{CONTACT.lede}</p>

          <ul className="mt-10 space-y-5 border-t border-white/10 pt-8 text-[0.9375rem]">
            <li className="flex gap-4">
              <Mail aria-hidden className="mt-0.5 size-5 shrink-0 text-blue-200" />
              <span>
                <span className="block text-ink-muted">Email</span>
                <a href={`mailto:${SITE.email}`} className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                  {SITE.email}
                </a>
                <Confirm note="Public contact email" />
              </span>
            </li>
            <li className="flex gap-4">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-blue-200" />
              <span>
                <span className="block text-ink-muted">Based in</span>
                <span className="font-semibold text-white">{SITE.location}</span>
                <Confirm note="Office location" />
              </span>
            </li>
            <li className="flex gap-4">
              <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-blue-200" />
              <span>
                <span className="block text-ink-muted">Response time</span>
                <span className="font-semibold text-white">{SITE.replyTime}</span>
                <Confirm note="Reply-time promise" />
              </span>
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7">
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  );
}
