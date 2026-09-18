import { Dialog, DialogContent } from "@bluethub/ui-kit";
import { Check, X, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export interface RLesson {
    title: string;
    teacher: string;
    subject: string;
    class: string;
    submittedOn: string;
    status: "Pending" | "Approved" | "Rejected";
    objectives?: string;
    lessonNotes: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    timeline: { label: string; date: string; done: boolean }[];
}

interface ReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson: RLesson | null;
}

const statusConfig = {
    Pending: {
        iconBg: "bg-orange-50",
        icon: <Clock className="size-5 text-orange-400" />,
        banner: {
            bg: "bg-[#FFF8ED] border-orange-200",
            icon: "text-orange-400",
            title: "Under Review",
            titleColor: "text-orange-500",
            message: "This lesson has been submitted and is currently being reviewed by the admin. You will be notified once a decision is made.",
            messageColor: "text-orange-400",
        },
    },
    Approved: {
        iconBg: "bg-green-50",
        icon: <Check className="size-5 text-green-500" />,
        banner: {
            bg: "bg-green-50 border-green-200",
            icon: "text-green-500",
            title: "Approved",
            titleColor: "text-green-600",
            message: "",
            messageColor: "text-green-600",
        },
    },
    Rejected: {
        iconBg: "bg-red-50",
        icon: <X className="size-5 text-red-500" />,
        banner: {
            bg: "bg-red-50 border-red-200",
            icon: "text-red-500",
            title: "Rejected — revision required",
            titleColor: "text-red-500",
            message: "",
            messageColor: "text-red-400",
        },
    },
};

export const ReviewModal = ({ open, onOpenChange, lesson }: ReviewModalProps) => {
    if (!lesson) return null;

    const config = statusConfig[lesson.status];
    const banner = config.banner;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="flex items-start gap-3 p-5 pb-4 border-b border-[#E8E8E3]">
                    <div className={`${config.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                        {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[#0F0F0E] font-semibold text-sm leading-tight">{lesson.title}</h2>
                        <p className="text-[#A8A8A4] text-[11px] mt-0.5">
                            {lesson.teacher} · {lesson.subject}  ·
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Subject", value: lesson.subject },
                            { label: "Class", value: lesson.class },
                            { label: "Submitted On", value: lesson.submittedOn },

                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-[#A8A8A4] text-[11px] font-normal">{label}</p>
                                <p className="text-[#0F0F0E] font-semibold text-sm mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Status banner */}
                    <div className={`border rounded-xl p-3.5 ${banner.bg}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            {lesson.status === "Approved" ? (
                                <Check className={`size-3.5 ${banner.icon}`} />
                            ) : lesson.status === "Rejected" ? (
                                <X className={`size-3.5 ${banner.icon}`} />
                            ) : (
                                <span className={`w-2 h-2 rounded-full bg-orange-400`} />
                            )}
                            <p className={`text-xs font-semibold ${banner.titleColor}`}>{banner.title}</p>
                        </div>

                        {lesson.status === "Pending" && (
                            <p className={`text-[11px] ${banner.messageColor}`}>{banner.message}</p>
                        )}
                        {lesson.status === "Approved" && lesson.approvedBy && (
                            <p className={`text-[11px] ${banner.messageColor}`}>
                                This lesson was approved by {lesson.approvedBy} on {lesson.approvedAt}. It has been added to the curriculum plan.
                            </p>
                        )}
                        {lesson.status === "Rejected" && lesson.rejectionReason && (
                            <p className={`text-[11px] ${banner.messageColor}`}>{lesson.rejectionReason}</p>
                        )}
                    </div>

                    {/* Lesson objectives */}
                    <div className="bg-gray-50 rounded-xl p-3.5">
                        <p className="text-[#A8A8A4] text-[11px] font-medium mb-1">Lesson objectives</p>
                        <p className="text-[#0F0F0E] text-xs leading-relaxed whitespace-pre-wrap break-words">{lesson.objectives}</p>
                    </div>

                    {/* Lesson notes */}
                    <div className="bg-gray-50 rounded-xl p-3.5">
                        <p className="text-[#A8A8A4] text-[11px] font-medium mb-1">Lesson Notes</p>
                        <p className="text-[#0F0F0E] text-xs leading-relaxed whitespace-pre-wrap break-words">

                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {(lesson.lessonNotes)
                                    .replace(/\\\(/g, "$")
                                    .replace(/\\\)/g, "$")}
                            </ReactMarkdown></p>
                    </div>

                    {/* Activity timeline */}
                    <div>
                        <p className="text-[#0F0F0E] text-xs font-semibold mb-3">Activity timeline</p>
                        <div className="space-y-3">
                            {lesson.timeline.map((t, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <div className="flex flex-col items-center">
                                        <span className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${t.done
                                            ? "bg-green-500"
                                            : t.label === "Rejected"
                                                ? "bg-red-500"
                                                : "bg-orange-400"
                                            }`} />
                                        {i < lesson.timeline.length - 1 && (
                                            <div className="w-px h-6 bg-gray-200 mt-1" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[#0F0F0E] text-xs font-semibold leading-tight">{t.label}</p>
                                        {t.date && <p className="text-[#A8A8A4] text-[10px] mt-0.5">{t.date}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};