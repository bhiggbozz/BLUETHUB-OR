import { useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";
import { Button } from "@bluethub/ui-kit/components/ui/button";
import { Input } from "@bluethub/ui-kit/components/ui/input";
import { Label } from "@bluethub/ui-kit/components/ui/label";
import { Textarea } from "@bluethub/ui-kit/components/ui/textarea";
import { SITE } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * Demo-request form on the shared shadcn inputs.
 * The site is static (no API), so a valid submission opens the visitor's email
 * app with everything pre-filled. Replace `deliver` to connect a real endpoint.
 */

const ROLES = ["Proprietor or owner", "Principal", "Head teacher", "School administrator", "Teacher", "Other"] as const;
const SIZES = ["Under 200", "200–500", "500–1,000", "Over 1,000"] as const;

interface Values {
  name: string;
  role: string;
  school: string;
  email: string;
  phone: string;
  size: string;
  message: string;
}
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { name: "", role: "", school: "", email: "", phone: "", size: "", message: "" };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Please tell us your name.";
  if (!v.role) e.role = "Which best describes your role?";
  if (!v.school.trim()) e.school = "Please add your school's name.";
  if (!v.email.trim()) e.email = "We need an email to reach you.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "That email doesn't look right. Try name@school.com.";
  if (v.phone.trim() && !/^[+\d][\d\s()-]{6,}$/.test(v.phone.trim())) e.phone = "Use digits only, like +234 801 234 5678.";
  return e;
}

function deliver(v: Values) {
  const lines = [
    `Name: ${v.name.trim()}`,
    `Role: ${v.role}`,
    `School: ${v.school.trim()}`,
    `Email: ${v.email.trim()}`,
  ];
  if (v.phone.trim()) lines.push(`Phone: ${v.phone.trim()}`);
  if (v.size) lines.push(`Students: ${v.size}`);
  const body = `${lines.join("\n")}${v.message.trim() ? `\n\n${v.message.trim()}` : ""}`;
  const subject = `Demo request: ${v.school.trim()}`;
  window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const nativeSelect =
  "h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow] " +
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30";

export function DemoForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const fid = (k: Field) => `${uid}-${k}`;

  const set = (k: Field) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (submitted || touched[k]) setErrors(validate(next));
  };
  const blur = (k: Field) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(values));
  };
  const shown = (k: Field) => ((submitted || touched[k]) && errors[k]) || undefined;
  const describe = (k: Field, hasHint = false) => (shown(k) || hasHint ? `${fid(k)}-msg` : undefined);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    deliver(values);
    setHandedOff(true);
  };

  const errorCount = submitted ? Object.keys(errors).length : 0;

  if (handedOff) {
    return (
      <div role="status" className="rounded-xl bg-card p-6 text-card-foreground shadow-float md:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Mail aria-hidden className="size-5" />
        </span>
        <h3 className="text-h3 mt-6">Your demo request is ready to send.</h3>
        <p className="mt-2 text-muted-foreground">
          We've opened your email app with your details filled in. Press send and it reaches us. {SITE.replyTime}
        </p>
        <p className="mt-4 text-[0.9375rem] text-muted-foreground">
          Nothing opened? Email us at{" "}
          <a className="font-semibold text-primary underline underline-offset-4" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
        <Button variant="outline" className="mt-6 h-11 px-5" onClick={() => setHandedOff(false)}>
          Back to the form
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={`${uid}-note`} className="rounded-xl bg-card p-6 text-card-foreground shadow-float md:p-8">
      {errorCount > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-[0.9375rem]"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p>{errorCount === 1 ? "One thing needs fixing" : `${errorCount} things need fixing`} before we can send this.</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={fid("name")} label="Your name" error={shown("name")}>
          <Input id={fid("name")} autoComplete="name" value={values.name} onChange={set("name")} onBlur={blur("name")} aria-invalid={!!shown("name")} aria-describedby={describe("name")} className="h-12 bg-background px-3 text-base" />
        </FormField>
        <FormField id={fid("role")} label="Your role" error={shown("role")}>
          <select id={fid("role")} value={values.role} onChange={set("role")} onBlur={blur("role")} aria-invalid={!!shown("role")} aria-describedby={describe("role")} className={nativeSelect}>
            <option value="">Choose your role</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </FormField>
        <FormField id={fid("school")} label="School name" error={shown("school")} className="sm:col-span-2">
          <Input id={fid("school")} autoComplete="organization" value={values.school} onChange={set("school")} onBlur={blur("school")} aria-invalid={!!shown("school")} aria-describedby={describe("school")} className="h-12 bg-background px-3 text-base" />
        </FormField>
        <FormField id={fid("email")} label="Work email" hint="We'll only use this to arrange your demo." error={shown("email")}>
          <Input id={fid("email")} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} onBlur={blur("email")} aria-invalid={!!shown("email")} aria-describedby={describe("email", true)} className="h-12 bg-background px-3 text-base" />
        </FormField>
        <FormField id={fid("phone")} label="Phone" optional hint="Useful if email is slow to reach you." error={shown("phone")}>
          <Input id={fid("phone")} type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} onBlur={blur("phone")} aria-invalid={!!shown("phone")} aria-describedby={describe("phone", true)} className="h-12 bg-background px-3 text-base" />
        </FormField>
        <FormField id={fid("size")} label="Number of students" optional className="sm:col-span-2">
          <select id={fid("size")} value={values.size} onChange={set("size")} className={nativeSelect}>
            <option value="">Choose a range</option>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormField>
        <FormField id={fid("message")} label="Anything we should know?" optional className="sm:col-span-2">
          <Textarea id={fid("message")} rows={4} value={values.message} onChange={set("message")} className="bg-background px-3 py-3 text-base" />
        </FormField>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${uid}-note`} className="text-caption max-w-xs">
          Sending opens your email app with this request filled in. {SITE.replyTime}
        </p>
        <Button type="submit" className="group h-12 px-6 text-base font-semibold max-sm:w-full">
          Book my demo
          <ArrowRight aria-hidden className="arrow-nudge size-4" />
        </Button>
      </div>
    </form>
  );
}

function FormField({
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
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="flex h-5 items-center justify-between gap-3 text-[0.9375rem] leading-none font-semibold text-heading">
        {label}
        {optional && <span className="text-caption leading-none font-normal">Optional</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-caption">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
