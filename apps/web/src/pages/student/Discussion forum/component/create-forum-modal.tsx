import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from "@bluethub/ui-kit";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState } from "react";
import TeacherInvites from "./teacher-invites";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Classmate {
    id: string;
    name: string;
    initials: string;
    color: string;
    class: string;
}

interface ForumForm {
    title: string;
    subject: string;
    description: string;
    groupType: "private" | "public";
    invitedIds: string[];
    inviteTeacher: boolean;
}

const SUBJECTS = [
    "Further Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
    "English Language",
    "Economics",
    "Geography",
];

const CLASSMATES: Classmate[] = [
    { id: "c1", name: "Chidi Uzoma", initials: "CU", color: "bg-purple-500", class: "Science SS3" },
    { id: "c2", name: "Ngozi Kalu", initials: "NK", color: "bg-red-500", class: "Science SS3" },
    { id: "c3", name: "Emeka Bello", initials: "EB", color: "bg-green-600", class: "Science SS3" },
    { id: "c4", name: "Taiwo Falade", initials: "TF", color: "bg-yellow-500", class: "Science SS3" },
    { id: "c5", name: "Ademidun Babs", initials: "AB", color: "bg-blue-500", class: "Science SS3" },
    { id: "c6", name: "Sandra Babs", initials: "SB", color: "bg-teal-500", class: "Science SS3" },
    { id: "c7", name: "Kemi Adeyemi", initials: "KA", color: "bg-pink-500", class: "Science SS3" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
);

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4F61E8]/30 focus:border-[#4F61E8] transition bg-gray-50";

// ── Step 1 ────────────────────────────────────────────────────────────────────
function StepOne({ form, setForm }: { form: ForumForm; setForm: React.Dispatch<React.SetStateAction<ForumForm>> }) {
    return (
        <div className="flex flex-col gap-5">
            <Field label="Forum Title" required>
                <Input
                    className={inputCls}
                    placeholder="e.g. Differentiation Study Group"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
            </Field>

            <Field label="Subject" required>
                <Select
                    value={form.subject}
                    onValueChange={(value) => setForm((f) => ({ ...f, subject: value }))}
                >
                    <SelectTrigger className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#4F61E8]/30 focus:border-[#4F61E8]">
                        <SelectValue placeholder="– Choose a Subject –" />
                    </SelectTrigger>
                    <SelectContent>
                        {SUBJECTS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <Field label="Topic / Description" hint="This helps classmates decide if they want to join">
                <Textarea
                    className={`${inputCls} resize-none`}
                    placeholder="What will this group study?"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>

            <Field label="Group Type">
                <Select
                    value={form.groupType}
                    onValueChange={(value) =>
                        setForm((f) => ({ ...f, groupType: value as "private" | "public" }))
                    }
                >
                    <SelectTrigger className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#4F61E8]/30 focus:border-[#4F61E8]">
                        <SelectValue placeholder="Select group type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="private">Private – invite only</SelectItem>
                        <SelectItem value="public">Public – anyone can join</SelectItem>
                    </SelectContent>
                </Select>
            </Field>


        </div>
    );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function StepTwo({ form, setForm }: { form: ForumForm; setForm: React.Dispatch<React.SetStateAction<ForumForm>> }) {
    const [search, setSearch] = useState("");

    const filtered = CLASSMATES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: string) => {
        setForm((f) => ({
            ...f,
            invitedIds: f.invitedIds.includes(id)
                ? f.invitedIds.filter((i) => i !== id)
                : [...f.invitedIds, id],
        }));
    };

    const selected = CLASSMATES.filter((c) => form.invitedIds.includes(c.id));

    return (
        <div className="flex flex-col gap-4">
            <Field label="Invite Classmates" required>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <Input
                        className={`${inputCls} pl-9`}
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </Field>

            {/* List */}
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {filtered.map((c, i) => {
                    const checked = form.invitedIds.includes(c.id);
                    return (
                        <div
                            key={c.id}
                            onClick={() => toggle(c.id)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${i !== filtered.length - 1 ? "border-b border-gray-50" : ""
                                } ${checked ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}
                        >
                            <div className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                {c.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-700">{c.name}</p>
                            </div>
                            <span className="text-xs text-gray-300 mr-2">{c.class}</span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-[#4F61E8] border-[#4F61E8]" : "border-gray-300"
                                }`}>
                                {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[11px] text-[#4F61E8]">
                Click a student to add them. You must invite at least 1 classmate.
            </p>

            {/* Selected */}
            <div>
                <p className="text-sm font-bold text-gray-700 mb-1">Selected ({selected.length})</p>
                {selected.length === 0 ? (
                    <p className="text-xs text-gray-400">No classmates selected yet</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selected.map((c) => (
                            <div key={c.id} className="flex items-center gap-1.5 bg-indigo-50 rounded-full px-3 py-1">
                                <div className={`w-5 h-5 rounded-full ${c.color} flex items-center justify-center text-white text-[9px] font-bold`}>
                                    {c.initials}
                                </div>
                                <span className="text-xs font-medium text-indigo-700">{c.name.split(" ")[0]}</span>
                                <button onClick={(e) => { e.stopPropagation(); toggle(c.id); }} className="text-indigo-300 hover:text-indigo-500">
                                    <X size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function StepThree({ form, setForm }: { form: ForumForm; setForm: React.Dispatch<React.SetStateAction<ForumForm>> }) {
    const selected = CLASSMATES.filter((c) => form.invitedIds.includes(c.id));
    const memberNames = ["You", ...selected.map((c) => c.name.split(" ")[0] + " " + c.name.split(" ")[1])].join(", ");

    const [selectedIdx, setSelectedIdx] = useState<string | null>()


    const rows = [
        { label: "Title", value: form.title || "—" },
        { label: "Subject", value: form.subject || "—" },
        { label: "Members", value: memberNames },
        { label: "Teacher", value: form.inviteTeacher && selectedIdx ? "Invited" : "None" },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Invite teacher toggle */}
            <div className="flex items-start justify-between gap-4 bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100">
                <div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        🎓 Invite a Teacher
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Teacher can join and answer questions when you're stuck
                    </p>
                </div>


                {/* Toggle */}
                <Switch
                    checked={form.inviteTeacher}
                    onCheckedChange={(checked) =>
                        setForm((f) => ({ ...f, inviteTeacher: checked }))
                    }
                    className="data-[state=checked]:bg-[#4F61E8] mt-0.5 flex-shrink-0"
                />

                </div>
                {form.inviteTeacher && (
                    <TeacherInvites
                        setSelectedIdx={setSelectedIdx}
                    />
                )}

            {/* Summary */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                    <p className="text-sm font-bold text-gray-700">Forum Summary</p>
                </div>
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0">
                        <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-gray-700">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
    return (
        <div className="flex gap-1.5 mb-6">
            {[1, 2, 3].map((s) => (
                <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-[#4F61E8]" : "bg-gray-100"
                        }`}
                />
            ))}
        </div>
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface CreateForumModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit?: (form: ForumForm) => void;
}

export function CreateForumModal({ open, onClose, onSubmit }: CreateForumModalProps) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<ForumForm>({
        title: "",
        subject: "",
        description: "",
        groupType: "private",
        invitedIds: [],
        inviteTeacher: false,
    });

    if (!open) return null;

    const canNext1 = form.title.trim() && form.subject;
    const canNext2 = form.invitedIds.length >= 1;

    const handleClose = () => {
        setStep(1);
        setForm({ title: "", subject: "", description: "", groupType: "private", invitedIds: [], inviteTeacher: false });
        onClose();
    };

    const stepLabel = step === 1 ? "Step 1/3 — Forum Details"
        : step === 2 ? "Step 2/3 — Invite Classmates"
            : "Final Step 3/3";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-50">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                        💬
                    </div>
                    <div className="flex-1">
                        <p className="text-base font-bold text-gray-800">Create Discussion Forum</p>
                        <p className="text-xs text-gray-400">Set up a study group and invite your classmates</p>
                    </div>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
                        <X size={14} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <p className="text-xs font-semibold text-gray-400 mb-3">{stepLabel}</p>
                    <StepIndicator step={step} />

                    {step === 1 && <StepOne form={form} setForm={setForm} />}
                    {step === 2 && <StepTwo form={form} setForm={setForm} />}
                    {step === 3 && <StepThree form={form} setForm={setForm} />}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-50 flex items-center gap-3 justify-between">
                    {step > 1 && (
                        <button
                            onClick={() => setStep((s) => s - 1)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft />  <span>Back</span>
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="px-4 flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>

                    {step === 1 && (
                        <button
                            onClick={() => setStep(2)}
                            disabled={!canNext1}
                            className="flex items-center justify-center gap-2 bg-[#4F61E8] hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                        >
                            <span>invite classmates</span>  <ChevronRight />
                        </button>
                    )}
                    {step === 2 && (
                        <button
                            onClick={() => setStep(3)}
                            disabled={!canNext2}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#4F61E8] hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium  px-4 py-2.5 text-sm rounded-xl transition-colors"
                        >
                            <span>Review </span> <ChevronRight />
                        </button>
                    )}
                    {step === 3 && (
                        <button
                            onClick={() => { onSubmit?.(form); handleClose(); }}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#4F61E8] hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                        >
                            Create
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}