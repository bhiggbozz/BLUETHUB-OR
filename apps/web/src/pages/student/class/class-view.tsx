import VideoLessonList from "./component/video-list"
import type { StudentPublishedLesson } from "@/services/student";

interface ClassViewProps {
    lessons: StudentPublishedLesson[];
    loading: boolean;
    selectedSubjectLabel: string;
    selectedTopicLabel?: string;
    summary?: {
        total: number;
        approved: number;
        pendingApproval: number;
        rejected: number;
        published: number;
    } | null;
}

const ClassView = ({ lessons, loading, selectedSubjectLabel, selectedTopicLabel, summary }: ClassViewProps) => {
    return (
        <div className="space-y-3 sm:space-y-4 pb-5">
            <section className="rounded-[16px] sm:rounded-[24px] border border-white/75 bg-white/90 px-3 sm:px-5 py-3 sm:py-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Classroom lessons</p>
                        <h2 className="text-base font-semibold text-slate-900 capitalize">{selectedSubjectLabel}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {selectedTopicLabel ? `Filtered by topic: ${selectedTopicLabel}` : "All topics in this subject"}
                        </p>
                    </div>
                    <div className="rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#4255db]">
                        {(summary?.total ?? lessons.length)} lesson{(summary?.total ?? lessons.length) === 1 ? "" : "s"}
                    </div>
                </div>

                {/* {summary && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Approved: {summary.approved}</span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pending: {summary.pendingApproval}</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Published: {summary.published}</span>
                    </div>
                )} */}
            </section>

            <div className="h-[calc(100vh-360px)] sm:h-[calc(100vh-300px)] lg:h-[calc(100vh-260px)] overflow-y-auto pb-7 [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar]:h-2.5 
      [&::-webkit-scrollbar-track]:rounded-full
      [&::-webkit-scrollbar-track]:bg-gray-100
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-gray-400
      dark:[&::-webkit-scrollbar-track]:bg-neutral-700
      dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                <VideoLessonList lessons={lessons} loading={loading} />
            </div>
        </div>
    )
}

export default ClassView