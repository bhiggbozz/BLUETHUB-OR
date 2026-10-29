import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import calendarService, {
  type CalendarTemplateDto,
  type CalendarTemplateKey,
  type CalendarTermPayload,
} from "@/services/calendar";
import { selectSession, upsertSession } from "@/store/calendar-slice";
import {
  MAX_SESSION_NAME_LENGTH,
  validateSessionFields,
  validateTerms,
  hasAnyTermErrors,
  type SessionFormErrors,
} from "../utils";
import StepTemplate from "./step-template";
import StepSession from "./step-session";
import StepTerms from "./step-terms";
import StepReview from "./step-review";

const STEPS = ["Template", "Session", "Terms", "Review"] as const;

function suggestedSessionName(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Most academic years start around August — before that, assume the
  // school is still in the year that started last August.
  return now.getMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

const CalendarSetupWizard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [templates, setTemplates] = useState<CalendarTemplateDto[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState<CalendarTemplateKey | null>(null);

  const [sessionName, setSessionName] = useState(suggestedSessionName());
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [sessionErrors, setSessionErrors] = useState<SessionFormErrors>({});

  const [terms, setTerms] = useState<CalendarTermPayload[]>([{ name: "", startDate: "", endDate: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDirty =
    templateKey !== null ||
    sessionName !== suggestedSessionName() ||
    !!sessionStart ||
    !!sessionEnd ||
    terms.some((t) => t.name || t.startDate || t.endDate);

  useEffect(() => {
    let cancelled = false;
    calendarService
      .getTemplates()
      .then((res) => {
        if (!cancelled) setTemplates(res.data?.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setTemplatesError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 or an accidental tab close mid-wizard shouldn't lose typed data —
  // this covers the tab-close/refresh case; in-app navigation is guarded by
  // handleLeave below.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const termValidation = useMemo(() => validateTerms(terms, { startDate: sessionStart, endDate: sessionEnd }), [terms, sessionStart, sessionEnd]);

  const handleLeave = () => {
    if (isDirty && !window.confirm("Discard this academic year setup? Your changes won't be saved.")) {
      return;
    }
    navigate("/calendar");
  };

  const handleSelectTemplate = (template: CalendarTemplateDto) => {
    setTemplateKey(template.key);
    setTerms(
      template.key === "Custom"
        ? [{ name: "", startDate: "", endDate: "" }]
        : template.termNames.map((name) => ({ name, startDate: "", endDate: "" })),
    );
  };

  const goNext = () => {
    if (step === 1) {
      if (!templateKey) return;
    }
    if (step === 2) {
      const errors = validateSessionFields({ name: sessionName, startDate: sessionStart, endDate: sessionEnd });
      setSessionErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    if (step === 3) {
      if (hasAnyTermErrors(termValidation.rowErrors, termValidation.generalError)) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleCreate = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await calendarService.createSession({
        name: sessionName.trim(),
        startDate: sessionStart,
        endDate: sessionEnd,
        template: templateKey ?? undefined,
        terms: terms.map((t) => ({ name: t.name.trim(), startDate: t.startDate, endDate: t.endDate })),
      });
      const created = res.data.data;
      dispatch(upsertSession(created));
      dispatch(selectSession(created.id));
      toast.success("Academic year created");
      navigate("/calendar");
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const nextDisabled =
    submitting ||
    (step === 1 && !templateKey) ||
    (step === 3 && hasAnyTermErrors(termValidation.rowErrors, termValidation.generalError));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 sm:px-6">
      {/* ── Step header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const state = num < step ? "done" : num === step ? "active" : "pending";
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      state === "done" ? "bg-[#4F61E8] text-white" : state === "active" ? "border-2 border-[#4F61E8] text-[#4F61E8]" : "border border-slate-300 text-slate-400",
                    ].join(" ")}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : num}
                  </span>
                  <span className={`hidden text-[10px] font-medium sm:block ${state === "pending" ? "text-slate-400" : "text-slate-600"}`}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`mx-1.5 h-0.5 flex-1 ${num < step ? "bg-[#4F61E8]" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        {step === 1 && (
          <StepTemplate
            templates={templates}
            loading={templatesLoading}
            error={templatesError}
            selectedKey={templateKey}
            onSelect={handleSelectTemplate}
          />
        )}
        {step === 2 && (
          <StepSession
            name={sessionName}
            startDate={sessionStart}
            endDate={sessionEnd}
            errors={sessionErrors}
            onChange={(patch) => {
              if (patch.name !== undefined) setSessionName(patch.name.slice(0, MAX_SESSION_NAME_LENGTH));
              if (patch.startDate !== undefined) setSessionStart(patch.startDate);
              if (patch.endDate !== undefined) setSessionEnd(patch.endDate);
            }}
          />
        )}
        {step === 3 && (
          <StepTerms
            session={{ startDate: sessionStart, endDate: sessionEnd }}
            terms={terms}
            rowErrors={termValidation.rowErrors}
            onChange={setTerms}
          />
        )}
        {step === 4 && (
          <StepReview name={sessionName} startDate={sessionStart} endDate={sessionEnd} terms={terms} submitError={submitError} />
        )}
      </div>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" disabled={submitting} onClick={step === 1 ? handleLeave : goBack}>
          <ChevronLeft className="h-3.5 w-3.5" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < STEPS.length ? (
          <Button type="button" disabled={nextDisabled} onClick={goNext} className="bg-[#4F61E8] hover:bg-[#4F61E8]/90">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button type="button" disabled={submitting} onClick={handleCreate} className="bg-[#4F61E8] hover:bg-[#4F61E8]/90">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Creating…" : "Create calendar"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CalendarSetupWizard;
