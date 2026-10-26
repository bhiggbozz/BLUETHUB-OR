import { useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Mail } from "lucide-react";
import { SITE } from "@/data/site";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";

/**
 * Static contact form.
 * There is no backend yet, so a valid submission opens the visitor's email app
 * with the details pre-filled (mailto). Swap `deliver` for a real endpoint later;
 * nothing else needs to change.
 */

const PROJECT_TYPES = [
  "A new product",
  "Improving an existing product",
  "One of our products (Skoolhub, QueensMoni, SABI, Cerebre Plus)",
  "Something else",
] as const;

const TIMELINES = ["As soon as possible", "In the next 1–3 months", "Just exploring"] as const;

interface Values {
  name: string;
  email: string;
  company: string;
  type: string;
  timeline: string;
  message: string;
}

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", email: "", company: "", type: "", timeline: "", message: "" };
const MIN_MESSAGE = 20;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Please tell us your name.";
  if (!v.email.trim()) e.email = "We need an email address to reply to you.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()))
    e.email = "That email doesn't look right. Try something like name@company.com.";
  if (!v.type) e.type = "Choose the option that fits best.";
  if (v.message.trim().length < MIN_MESSAGE)
    e.message = `A little more detail helps us reply properly: at least ${MIN_MESSAGE} characters.`;
  return e;
}

function buildMailto(v: Values) {
  const subject = `Project enquiry from ${v.name.trim()}${v.company.trim() ? `, ${v.company.trim()}` : ""}`;
  const details = [`Name: ${v.name.trim()}`, `Email: ${v.email.trim()}`];
  if (v.company.trim()) details.push(`Company: ${v.company.trim()}`);
  details.push(`Looking for: ${v.type}`);
  if (v.timeline) details.push(`Timeline: ${v.timeline}`);
  const body = `${details.join("\n")}\n\n${v.message.trim()}`;
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The single swap point for a real form endpoint. */
function deliver(v: Values) {
  window.location.href = buildMailto(v);
}

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const fid = (k: keyof Values) => `${uid}-${k}`;

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (submitted || touched[k]) setErrors(validate(next));
  };
  const blur = (k: keyof Values) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(values));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    deliver(values);
    setHandedOff(true);
  };

  const show = (k: keyof Values) => (submitted || touched[k]) && errors[k];
  const errorCount = submitted ? Object.keys(errors).length : 0;

  if (handedOff) {
    return (
      <div role="status" className="rounded-lg bg-card p-6 text-card-foreground shadow-lift md:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Mail aria-hidden className="size-5" />
        </span>
        <h3 className="text-h3 mt-6">Your email is ready to send.</h3>
        <p className="mt-2 text-muted">
          We've opened your email app with your message filled in. Press send there and it reaches us.{" "}
          {SITE.replyTime}
        </p>
        <p className="mt-4 text-[0.9375rem] text-muted">
          Nothing opened? Write to us directly at{" "}
          <a className="font-semibold text-primary underline underline-offset-4" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => setHandedOff(false)}>
          Back to the form
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-describedby={`${uid}-note`}
      className="rounded-lg bg-card p-6 text-card-foreground shadow-lift md:p-8"
    >
      {errorCount > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-[0.9375rem] text-foreground"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <p>
            {errorCount === 1 ? "One thing needs fixing" : `${errorCount} things need fixing`} before we can send this.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid("name")} label="Your name" error={show("name")}>
          <input
            id={fid("name")}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={set("name")}
            onBlur={blur("name")}
            aria-invalid={Boolean(show("name"))}
            aria-describedby={show("name") ? `${fid("name")}-msg` : undefined}
            className={inputCls(show("name"))}
          />
        </Field>
        <Field id={fid("email")} label="Work email" hint="Only used to reply to you." error={show("email")}>
          <input
            id={fid("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={set("email")}
            onBlur={blur("email")}
            aria-invalid={Boolean(show("email"))}
            aria-describedby={`${fid("email")}-msg`}
            className={inputCls(show("email"))}
          />
        </Field>
        <Field id={fid("company")} label="Company or school" optional>
          <input
            id={fid("company")}
            name="company"
            autoComplete="organization"
            value={values.company}
            onChange={set("company")}
            className={inputCls()}
          />
        </Field>
        <Field id={fid("timeline")} label="When do you want to start?" optional>
          <select id={fid("timeline")} name="timeline" value={values.timeline} onChange={set("timeline")} className={inputCls()}>
            <option value="">Choose a timeline</option>
            {TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field id={fid("type")} label="What can we help with?" error={show("type")} className="sm:col-span-2">
          <select
            id={fid("type")}
            name="type"
            value={values.type}
            onChange={set("type")}
            onBlur={blur("type")}
            aria-invalid={Boolean(show("type"))}
            aria-describedby={show("type") ? `${fid("type")}-msg` : undefined}
            className={inputCls(show("type"))}
          >
            <option value="">Choose one</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field
          id={fid("message")}
          label="Tell us about it"
          hint="The problem, who it's for and any deadlines. A few sentences is plenty."
          error={show("message")}
          className="sm:col-span-2"
        >
          <textarea
            id={fid("message")}
            name="message"
            rows={5}
            value={values.message}
            onChange={set("message")}
            onBlur={blur("message")}
            aria-invalid={Boolean(show("message"))}
            aria-describedby={`${fid("message")}-msg`}
            className={cn(inputCls(show("message")), "h-auto resize-y py-3")}
          />
        </Field>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${uid}-note`} className="text-caption max-w-xs">
          Sending opens your email app with this message filled in. {SITE.replyTime}
        </p>
        <Button type="submit" size="lg" arrow className="w-full sm:w-auto">
          Send message
        </Button>
      </div>
    </form>
  );
}

function inputCls(error?: string | false) {
  return cn(
    "h-12 w-full rounded-md border bg-background px-4 text-base text-foreground transition-[border-color,box-shadow]",
    "placeholder:text-subtle focus:outline-none focus:ring-4",
    error
      ? "border-danger focus:border-danger focus:ring-danger/15"
      : "border-border-strong hover:border-muted focus:border-primary focus:ring-primary/15",
  );
}

function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | false;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 text-[0.9375rem] font-semibold text-heading">
        {label}
        {optional && <span className="text-caption font-normal">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-caption mt-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
