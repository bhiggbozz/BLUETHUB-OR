import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  assessmentService,
  type PendingGradeItem,
} from "@/services/assessment";
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  SkipForward,
  BookOpen,
  AlertCircle,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import BoardViewerModal from "../component/board-viewer";

const questionTypeLabels: Record<number, string> = {
  2: "Short Answer",
  3: "Essay",
  5: "Fill in the Blank",
  6: "Image Based",
  7: "Board Based",
  8: "Mixed",
};

const getTypeLabel = (t: number) => questionTypeLabels[t] ?? `Type ${t}`;

interface AssessmentGroup {
  assessmentId: string;
  assessmentCode: string;
  assessmentTitle: string;
  items: PendingGradeItem[];
}

const PendingGradingPage = () => {
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  const [items, setItems] = useState<PendingGradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeModal, setGradeModal] = useState<PendingGradeItem | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [boardViewItem, setBoardViewItem] = useState<PendingGradeItem | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    void fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getPendingGradings();
      const data = res.data?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load pending gradings.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openGradeModal = (item: PendingGradeItem) => {
    setGradeModal(item);
    setMarks(0);
    setFeedback("");
  };

  const handleGrade = async () => {
    if (!gradeModal) return;
    if (marks < 0 || marks > gradeModal.maxMarks) {
      toast.error(`Marks must be between 0 and ${gradeModal.maxMarks}`);
      return;
    }
    if (!feedback.trim()) {
      toast.error("Please provide feedback.");
      return;
    }

    setGradingId(gradeModal.answerId);
    try {
      await assessmentService.gradeAnswer(gradeModal.answerId, {
        manualMarksObtained: marks,
        teacherFeedback: feedback.trim(),
      });
      toast.success("Answer graded successfully");
      setGradeModal(null);
      setItems((prev) => prev.filter((i) => i.answerId !== gradeModal.answerId));
    } catch (error: any) {
      const msg =
        error?.response?.data?.responseMessage ??
        error?.message ??
        "Failed to grade answer";
      toast.error(msg);
    } finally {
      setGradingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) =>
        i.assessmentTitle.toLowerCase().includes(q) ||
        i.studentName.toLowerCase().includes(q) ||
        i.assessmentCode.toLowerCase().includes(q) ||
        i.questionTitle.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, AssessmentGroup>();
    for (const item of filtered) {
      const key = item.assessmentId;
      if (!map.has(key)) {
        map.set(key, {
          assessmentId: item.assessmentId,
          assessmentCode: item.assessmentCode,
          assessmentTitle: item.assessmentTitle,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden bg-white/70">
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5  flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={openMobileNav} className="lg:hidden text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => navigate(-1)} className="p-1.5 hidden sm:block">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <h2 className="font-semibold text-base text-white leading-none">Pending Grading</h2>
          </div>
          <button
            onClick={() => void fetchPending()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            <Loader2 className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="p-4 sm:p-6 min-h-screen max-w-5xl mx-auto space-y-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by assessment, student, or question…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading pending gradings…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {items.length === 0 ? "No pending gradings" : "No items match your search"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {items.length === 0
                  ? "All manual-grade answers have been reviewed."
                  : "Try adjusting your search query."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isOpen = expandedGroups.has(group.assessmentId);
                const studentCount = new Set(group.items.map((i) => i.studentName)).size;
                return (
                  <div key={group.assessmentId} className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.assessmentId)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-mono text-chestnut bg-chestnut/10 px-2 py-0.5 rounded-full">
                            {group.assessmentCode}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">{group.items.length} pending answer{group.items.length > 1 ? "s" : ""}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">{group.assessmentTitle}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-3.5 h-3.5" />
                            {group.items.length} question{group.items.length > 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {studentCount} student{studentCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-slate-400">
                        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 divide-y divide-slate-100">
                        {group.items.map((item) => (
                          <div key={item.answerId} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                    {getTypeLabel(item.questionType)}
                                  </span>
                                  {item.isSkipped && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <SkipForward className="w-3 h-3" />
                                      Skipped
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {item.studentName} · {item.questionTitle}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-xs text-slate-400">Max</p>
                                  <p className="text-lg font-bold text-[#292382]">{item.maxMarks}</p>
                                </div>
                                {item.boards && item.boards.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setBoardViewItem(item); }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Board
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openGradeModal(item); }}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#292382] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3D36A8] transition-colors"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                  Grade
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Student Answer</p>
                              <div className="text-sm text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1 line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: item.typedAnswer || (item.isSkipped ? "(Skipped)" : "(No answer provided)") }}
                              />
                            </div>

                            {item.attemptStatus && (
                              <div className="mt-2 flex items-center gap-1.5">
                                {item.attemptStatus === "Submitted" ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-amber-500" />
                                )}
                                <span className="text-[10px] text-slate-500">{item.attemptStatus}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {gradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#292382] to-[#3D36A8] px-5 py-4">
              <h3 className="text-base font-bold text-white">Grade Answer</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {gradeModal.studentName} · {gradeModal.assessmentCode}
              </p>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Question</p>
                <p className="text-sm font-semibold text-slate-800">{gradeModal.questionTitle}</p>
                {gradeModal.questionText && (
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{gradeModal.questionText}</p>
                )}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Student Answer</p>
                {gradeModal.boards && gradeModal.boards.length > 0 ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <p className="text-xs text-amber-600">{gradeModal.boards.length} board{gradeModal.boards.length > 1 ? "s" : ""} with {gradeModal.boards.reduce((s, b) => s + b.strokeCount, 0)} total strokes</p>
                    <button
                      type="button"
                      onClick={() => setBoardViewItem(gradeModal)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      View Board Answer
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-amber-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1"
                    dangerouslySetInnerHTML={{ __html: gradeModal.typedAnswer || (gradeModal.isSkipped ? "(Skipped)" : "(No answer provided)") }}
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Marks (0 – {gradeModal.maxMarks})
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={gradeModal.maxMarks}
                    value={marks}
                    onChange={(e) => setMarks(Math.max(0, Math.min(gradeModal.maxMarks, Number(e.target.value) || 0)))}
                    className="w-24 h-10 rounded-xl border border-slate-200 text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-chestnut/15"
                  />
                  <span className="text-xs text-slate-400">/ {gradeModal.maxMarks}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Provide feedback on the student's answer…"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chestnut/15 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setGradeModal(null)}
                className="h-10 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrade}
                disabled={gradingId === gradeModal.answerId}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#292382] text-sm font-semibold text-white hover:bg-[#3D36A8] transition-colors disabled:opacity-50"
              >
                {gradingId === gradeModal.answerId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {boardViewItem?.boards && boardViewItem.boards.length > 0 && (
        <BoardViewerModal
          boards={boardViewItem.boards}
          studentName={boardViewItem.studentName}
          questionTitle={boardViewItem.questionTitle}
          onClose={() => setBoardViewItem(null)}
        />
      )}
    </div>
  );
};

export default PendingGradingPage;
