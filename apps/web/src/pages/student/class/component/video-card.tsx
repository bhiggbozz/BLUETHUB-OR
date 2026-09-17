import { CalendarDays, Clock, Download, Loader2, Signal } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import Play from '@/assets/svg/play.svg?react'
import { useNavigate } from "react-router-dom";
import type { StudentPublishedLesson } from "@/services/student";
import enginerring from "@/assets/png/engineering.png";
import { useEffect, useMemo, useState } from "react";
import quizService from "@/services/quiz";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface VideoLessonCardProps {
    lesson: StudentPublishedLesson;
}

import { File, FileImage, FileText, FileVideo } from "lucide-react";

function FileIcon({ ext }: { ext: string }) {
  if (ext.includes("pdf")) return (
    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
      <FileText className="w-5 h-5 text-red-500" />
    </div>
  );

  if (ext.includes("mp4") || ext.includes("mov") || ext.includes("avi") || ext.includes("video")) return (
    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
      <FileVideo className="w-5 h-5 text-purple-500" />
    </div>
  );

  if (ext.includes("jpg") || ext.includes("jpeg") || ext.includes("png") || ext.includes("webp") || ext.includes("image")) return (
    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
      <FileImage className="w-5 h-5 text-blue-500" />
    </div>
  );

  if (ext.includes("doc") || ext.includes("docx") || ext.includes("note")) return (
    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
      <FileText className="w-5 h-5 text-amber-500" />
    </div>
  );

  // fallback
  return (
    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
      <File className="w-5 h-5 text-slate-400" />
    </div>
  );
}

const VideoLessonCard = ({ lesson }: VideoLessonCardProps) => {
    const navigate = useNavigate()
    const [showMediaPanel, setShowMediaPanel] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [quizMeta, setQuizMeta] = useState<{ questionCount: number; timeLimitMinutes: number | null } | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
    const [isDownloadingError, setIsDownloadingError] = useState(false);

    const mediaFiles = useMemo(
        () => [...(lesson.media ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
        [lesson.media],
    );

    // const activeMedia = mediaFiles[activeMediaIndex] ?? null;

    useEffect(() => {
        if (!lesson.quizCode) { setQuizMeta(null); return; }
        let cancelled = false;
        const fetchMeta = async () => {
            try {
                const res = await quizService.getStudentQuizDisplayByCode(lesson.quizCode!);
                const data = res.data?.data;
                if (!cancelled && data) {
                    setQuizMeta({ questionCount: data.totalQuestions, timeLimitMinutes: data.config.timeLimitMinutes });
                }
            } catch {
                if (!cancelled) setQuizMeta(null);
            }
        };
        void fetchMeta();
        return () => { cancelled = true; };
    }, [lesson.quizCode]);

    useEffect(() => {
        if (!isDownloadingError) return;
        const timer = window.setTimeout(() => setIsDownloadingError(false), 5000);
        return () => window.clearTimeout(timer);
    }, [isDownloadingError]);

    const approvedDate = (lesson.approvedAt || lesson.createdAt)
        ? new Date(lesson.approvedAt || lesson.createdAt || "").toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : "N/A";

    const expiryDate = lesson.accessEndsAt
        ? new Date(lesson.accessEndsAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })
        : "No expiry";

    const durationLabel = `${Math.max(1, lesson.mediaCount)} file${lesson.mediaCount === 1 ? "" : "s"}`;
    const lessonDuration = lesson.durationMinutes ? `${lesson.durationMinutes} min` : "Flexible";

    // const activeMediaType = (activeMedia?.mediaType ?? "").toLowerCase();
    // const activeMediaExtension = (activeMedia?.fileExtension ?? "").toLowerCase();

    


    const handleDownload = async (e: React.MouseEvent, media: typeof mediaFiles[number]) => {
        setIsDownloadingError(false);
        e.stopPropagation(); // don't let it also select the media row
        const id = media.mediaId ?? media.mediaName;
        if (downloadingId === id) return;

        setDownloadingId(id);
        try {
            const res = await fetch(media.url);
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = media.mediaName || "lesson-media";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to download media:", err);
            setIsDownloadingError(true);
            // optionally toast.error("Could not download file")
        } finally {
            setDownloadingId(null);
        }
    };

    // const renderMediaPreview = () => {
    //     if (!activeMedia) {
    //         return (
    //             <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
    //                 Select a lesson media file to preview.
    //             </div>
    //         );
    //     }

    //     if (activeMediaType.includes("video") || activeMediaExtension === "mp4" || activeMediaExtension === "webm") {
    //         return <video controls className="h-48 sm:h-64 w-full rounded-xl bg-black" src={activeMedia.url} />;
    //     }

    //     if (activeMediaType.includes("image") || ["jpg", "jpeg", "png", "webp", "gif"].includes(activeMediaExtension)) {
    //         return <img src={activeMedia.url} alt={activeMedia.mediaName} className="h-48 sm:h-64 w-full rounded-xl object-cover" />;
    //     }

    //     if (activeMediaType.includes("pdf") || activeMediaExtension === "pdf") {
    //         return (
    //             <iframe
    //                 src={activeMedia.url}
    //                 title={activeMedia.mediaName}
    //                 className="h-56 sm:h-72 w-full rounded-xl border border-slate-200 bg-white"
    //             />
    //         );
    //     }

    //     return (
    //         <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
    //             <div>
    //                 <p className="text-sm font-semibold text-slate-700">Preview not available</p>
    //                 <a href={activeMedia.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-[#4255db] underline">
    //                     Open {activeMedia.mediaName}
    //                 </a>
    //             </div>
    //         </div>
    //     );
    // };

    return (
        <div className="group rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f9fbff_100%)] px-4 py-5 shadow-sm transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4">
                <div className="relative h-24 w-full overflow-hidden rounded-[12px] sm:rounded-[14px] sm:h-28 md:h-24 sm:md:w-38">
                    <img src={enginerring} alt={lesson.topicName} className="h-full w-full rounded-[14px] object-cover" />
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white">
                        {durationLabel}
                    </span>
                </div>

                <div className="flex-1 space-y-1 capitalize">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4255db]">
                            {lesson.status ?? "Approved"}
                        </span>
                        {lesson.approvedByName && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                Approved by {lesson.approvedByName}
                            </span>
                        )}
                        {lesson.quizCode && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                {quizMeta
                                    ? `${quizMeta.questionCount} question${quizMeta.questionCount === 1 ? "" : "s"}${quizMeta.timeLimitMinutes ? ` \u00B7 ${quizMeta.timeLimitMinutes} min` : ""}`
                                    : "Quiz attached"}
                            </span>
                        )}
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">{lesson.topicName}</h3>
                    <p className="text-sm leading-6 text-slate-600">
                        {}
                        <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {(lesson.description || lesson.aim || "No description available.")
                          .replace(/\\\(/g, "$")
                          .replace(/\\\)/g, "$")}
                      </ReactMarkdown>
                    </p>


                </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">{approvedDate}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-slate-500">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{lesson.subTopic || "Sub-topic"}</span>
                    </div>

                    <div className="rounded-full bg-slate-100 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-600 whitespace-nowrap">
                        Duration: {lessonDuration}
                    </div>

                    <div className="rounded-full bg-rose-50 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-rose-600 whitespace-nowrap">
                        Expires: {expiryDate}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-700">
                        <Signal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f0b429] shrink-0" />
                        <span>{lesson.teacherName}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <Button
                        onClick={() =>
                            navigate(`/student/recorded-class/${lesson.id}/watch`, {
                                state: { lesson },
                            })
                        }
                        className="rounded-full bg-student-chestnut px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#4052D6]"
                    >
                        <Play className="text-white w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Watch</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowMediaPanel((prev) => !prev);
                            setActiveMediaIndex(0);
                        }}
                        className="rounded-full border border-student-chestnut/30 bg-[#F3F4FF] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-student-chestnut hover:bg-[#E8EAFF]"
                    >
                        Lesson media files
                    </Button>

                    {lesson.quizCode && (
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/student/quiz/${lesson.quizCode}`)}
                            className="rounded-full border border-amber-300 bg-amber-50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-amber-700 hover:bg-amber-100"
                        >
                            Take Quiz
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Media files panel ─────────────────────────────────────────── */}
            {showMediaPanel && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">Lesson media files ({mediaFiles.length})</p>
                        {isDownloadingError && (
                            <p className="text-xs font-medium text-rose-600">
                                Failed to download file. Please try again.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowMediaPanel(false)}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-700"
                        >
                            Close
                        </button>
                    </div>

                    {mediaFiles.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                            No media files attached to this lesson.
                        </p>
                    ) : (
                        <div className="grid gap-4 grid-cols-1">
                            <div className="divide-y divide-slate-100 space-y-2">
                                {mediaFiles.map((media, index) => {
                                    const id = media.mediaId ?? media.mediaName;
                                    const isDownloading = downloadingId === id;
                                    const isActive = activeMediaIndex === index;

                                    // pick icon based on type
                                    const ext = (media.fileExtension ?? media.mediaType ?? "").toLowerCase();
                

                                    return (
                                        <button
                                            key={id ?? index}
                                            type="button"
                                            onClick={() => setActiveMediaIndex(index)}
                                            className={`w-full flex items-center gap-4 px-2  md:px-4 md:py-4 text-left transition ${isActive ? "bg-indigo-50/60 p-2 rounded-md" : "bg-white hover:bg-slate-50"
                                                }`}
                                        >
                                            {/* File icon tile */}
                                           <FileIcon ext={ext} />

                                            {/* Name + meta */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{media.mediaName}</p>
                                                
                                            </div>

                                            {/* Download */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDownload(e, media)}
                                                disabled={isDownloading}
                                                className="shrink-0 text-slate-400 hover:text-[#4255db] transition-colors disabled:opacity-50"
                                                aria-label={`Download ${media.mediaName}`}
                                            >
                                                {isDownloading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-[#4255db]" />
                                                ) : (
                                                    <Download className="w-5 h-5" />
                                                )}
                                            </button>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default VideoLessonCard;
