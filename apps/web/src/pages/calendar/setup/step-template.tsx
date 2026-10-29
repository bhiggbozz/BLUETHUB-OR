import { AlertCircle, CalendarCheck2, CheckCircle2 } from "lucide-react";
import type { CalendarTemplateDto, CalendarTemplateKey } from "@/services/calendar";

interface StepTemplateProps {
  templates: CalendarTemplateDto[];
  loading: boolean;
  error: string | null;
  selectedKey: CalendarTemplateKey | null;
  onSelect: (template: CalendarTemplateDto) => void;
}

export function StepTemplate({ templates, loading, error, selectedKey, onSelect }: StepTemplateProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Choose how your school splits the year into terms. This only sets the number and names of term rows — you'll
        pick every date yourself next.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const selected = selectedKey === template.key;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onSelect(template)}
              className={[
                "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-colors",
                selected ? "border-[#4F61E8] bg-[#4F61E8]/5" : "border-slate-200 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between">
                <CalendarCheck2 className={`h-5 w-5 ${selected ? "text-[#4F61E8]" : "text-slate-400"}`} />
                {selected && <CheckCircle2 className="h-5 w-5 text-[#4F61E8]" />}
              </div>
              <p className="text-sm font-semibold text-slate-800">{template.label}</p>
              <p className="text-xs text-slate-500">
                {template.key === "Custom" ? "Start from a single blank term" : template.termNames.join(" · ")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StepTemplate;
