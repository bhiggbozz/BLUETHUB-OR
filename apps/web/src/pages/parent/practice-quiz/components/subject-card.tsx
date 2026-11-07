import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParentQuizSubjectDto } from "@/services/parent-quiz";
import { MIN_QUESTIONS, selectableSubTopicIds, type SubjectSelection } from "../lib";

interface SubjectCardProps {
  subject: ParentQuizSubjectDto;
  active: boolean;
  selection: SubjectSelection;
  onSelect: () => void;
  onToggleWholeTopic: (topicId: string) => void;
  onToggleSubTopic: (subTopicId: string) => void;
  onToggleAllSubTopics: (topicId: string) => void;
  /** Deep-linked from "What was taught" — this topic/sub-topic starts expanded. */
  initialExpandedTopicId?: string | null;
}

function TinyCheckbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-md border",
        disabled
          ? "border-(--pp-line) bg-(--pp-sunken)"
          : checked
            ? "border-(--pp-iris) bg-(--pp-iris) text-white"
            : "border-(--pp-line-strong) bg-(--pp-surface)",
      )}
    >
      {checked && !disabled && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

export function SubjectCard({
  subject,
  active,
  selection,
  onSelect,
  onToggleWholeTopic,
  onToggleSubTopic,
  onToggleAllSubTopics,
  initialExpandedTopicId,
}: SubjectCardProps) {
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(initialExpandedTopicId ?? null);
  const disabled = subject.topics.length === 0 || subject.available.total < MIN_QUESTIONS;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        disabled
          ? "border-dashed border-(--pp-line) bg-(--pp-sunken) opacity-60"
          : active
            ? "border-(--pp-iris) bg-(--pp-iris-soft)/30"
            : "border-(--pp-line) bg-(--pp-surface) hover:border-(--pp-line-strong)",
      )}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onSelect}
        disabled={disabled}
        aria-expanded={active}
        className="flex w-full items-center justify-between gap-3 p-4 text-left disabled:cursor-not-allowed"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-(--pp-text)">{subject.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-(--pp-subtle)">
            {disabled && <Lock className="size-3" />}
            {subject.topics.length === 0
              ? "No questions available yet"
              : disabled
                ? "Not enough questions yet"
                : `${subject.available.total} question${subject.available.total === 1 ? "" : "s"} available`}
          </p>
        </div>
        {!disabled && (
          <ChevronDown className={cn("size-4 shrink-0 text-(--pp-subtle) transition-transform", active && "rotate-180")} />
        )}
      </button>

      {active && !disabled && (
        <div className="space-y-1 border-t border-(--pp-line) px-3 py-3">
          <p className="px-1 pb-1 text-[11px] text-(--pp-subtle)">
            Whole subject is selected by default — pick topics or sub-topics to narrow it down.
          </p>
          {subject.topics.map((topic) => {
            const subTopics = topic.subTopics ?? [];
            const hasSubTopics = subTopics.length > 0;

            if (!hasSubTopics) {
              const checked = selection.topicIds.has(topic.topicId);
              return (
                <button
                  key={topic.topicId}
                  type="button"
                  onClick={() => onToggleWholeTopic(topic.topicId)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-(--pp-sunken)"
                >
                  <TinyCheckbox checked={checked} />
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-(--pp-text)">{topic.name}</span>
                  <span className="pp-num shrink-0 text-[11px] text-(--pp-subtle)">{topic.available.total}</span>
                </button>
              );
            }

            const selectable = selectableSubTopicIds(topic);
            const allSelected = selectable.length > 0 && selectable.every((id) => selection.subTopicIds.has(id));
            const expanded = expandedTopicId === topic.topicId;

            return (
              <div key={topic.topicId} className="rounded-xl">
                <div className="flex items-center gap-1 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => onToggleAllSubTopics(topic.topicId)}
                    disabled={selectable.length === 0}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1.5 text-left hover:bg-(--pp-sunken) disabled:cursor-not-allowed disabled:opacity-50"
                    title="Select every sub-topic with practice questions"
                  >
                    <TinyCheckbox checked={allSelected} disabled={selectable.length === 0} />
                    <span className="min-w-0 flex-1 text-[13px] font-medium text-(--pp-text)">{topic.name}</span>
                    <span className="pp-num shrink-0 text-[11px] text-(--pp-subtle)">{topic.available.total}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedTopicId(expanded ? null : topic.topicId)}
                    aria-label={expanded ? `Collapse ${topic.name}` : `Show sub-topics of ${topic.name}`}
                    aria-expanded={expanded}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-(--pp-subtle) hover:bg-(--pp-sunken)"
                  >
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                </div>

                {expanded && (
                  <div className="ml-6 space-y-0.5 border-l border-(--pp-line) pl-2">
                    {subTopics.map((subTopic) => {
                      const subChecked = selection.subTopicIds.has(subTopic.subTopicId);
                      const tooFew = subTopic.available.total < MIN_QUESTIONS;
                      return (
                        <button
                          key={subTopic.subTopicId}
                          type="button"
                          disabled={tooFew}
                          onClick={() => onToggleSubTopic(subTopic.subTopicId)}
                          title={tooFew ? "Not enough questions yet" : undefined}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-(--pp-sunken) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <TinyCheckbox checked={subChecked} disabled={tooFew} />
                          <span className="min-w-0 flex-1 text-[12.5px] text-(--pp-text)">
                            {subTopic.name}
                            {tooFew && <span className="ml-1.5 text-[11px] text-(--pp-subtle)">Not enough questions yet</span>}
                          </span>
                          <span className="pp-num shrink-0 text-[11px] text-(--pp-subtle)">{subTopic.available.total}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SubjectCard;
