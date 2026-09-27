import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Badge,
  Checkbox,
} from "@bluethub/ui-kit";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Lock,
  Search,
} from "lucide-react";
import { questionService, type QuestionSummaryDto } from "@/services/question";

const DIFFICULTY_META = [
  { label: "Easy", color: "text-emerald-500", bg: "bg-emerald-50" },
  { label: "Medium", color: "text-amber-500", bg: "bg-amber-50" },
  { label: "Hard", color: "text-orange-500", bg: "bg-orange-50" },
  { label: "Expert", color: "text-red-500", bg: "bg-red-50" },
];

const TYPE_LABELS: Record<number, string> = {
  1: "Multiple Choice",
  2: "Short Answer",
  3: "Essay",
  4: "True/False",
  5: "Fill Blank",
  6: "Image Based",
  7: "Board Based",
  8: "Mixed",
};

interface SelectQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (questions: QuestionSummaryDto[]) => void;
  classroomId?: string;
  subjectId?: string;
  subTopicId?: string;
}

const SelectQuestionsModal = ({
  open,
  onClose,
  onSelect,
  classroomId,
  subjectId,
  subTopicId,
}: SelectQuestionsModalProps) => {
  const [questions, setQuestions] = useState<QuestionSummaryDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const pageSize = 20;

  const fetchQuestions = async (p: number, search?: string) => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const params: any = { page: p, pageSize };
      if (search?.trim()) params.searchText = search.trim();

      let res;
      if (classroomId && subTopicId && subTopicId !== "00000000-0000-0000-0000-000000000000") {
        res = await questionService.getQuestionsByClassroomSubjectSubTopic(classroomId, subjectId, subTopicId, params);
      } else if (subTopicId && subTopicId !== "00000000-0000-0000-0000-000000000000") {
        res = await questionService.getQuestionsBySubjectSubTopic(subjectId, subTopicId, params);
      } else if (classroomId) {
        res = await questionService.getQuestionsByClassroomSubject(classroomId, subjectId, params);
      } else {
        setQuestions([]);
        setTotalCount(0);
        setHasMore(false);
        return;
      }

      const data = res.data;
      setQuestions(data.questions ?? []);
      setTotalCount(data.totalCount ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch {
      setQuestions([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && subjectId) {
      setSelected(new Set());
      setPage(1);
      setSearchText("");
      fetchQuestions(1);
    }
  }, [open, subjectId, classroomId, subTopicId]);

  const handleSearch = () => {
    setPage(1);
    fetchQuestions(1, searchRef.current?.value);
  };

  const handlePrevPage = () => {
    const next = page - 1;
    if (next < 1) return;
    setPage(next);
    fetchQuestions(next, searchText);
  };

  const handleNextPage = () => {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchQuestions(next, searchText);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = questions.filter((q) => selected.has(q.id));
    if (picked.length === 0) return;
    onSelect(picked);
    onClose();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Existing Questions</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={searchRef}
              placeholder="Search questions..."
              className="pl-9 h-10 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
          </div>
          <Button onClick={handleSearch} variant="outline" size="sm" className="h-10">
            Search
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 border rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Search className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No questions found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {questions.map((q) => {
                const isSelected = selected.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                    }`}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(q.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate max-w-md">
                          {q.title || "Untitled"}
                        </span>
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-normal">
                          {TYPE_LABELS[q.questionType] ?? "Unknown"}
                        </Badge>
                        {q.isAdminOnly && (
                          <Badge className="text-[11px] px-2 py-0.5 font-normal gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200">
                            <Lock size={9} />
                            Admin Only
                          </Badge>
                        )}
                        {q.difficultyLevel > 0 && (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              DIFFICULTY_META[q.difficultyLevel - 1]?.color ?? "text-slate-400"
                            } ${
                              DIFFICULTY_META[q.difficultyLevel - 1]?.bg ?? "bg-slate-50"
                            }`}
                          >
                            {DIFFICULTY_META[q.difficultyLevel - 1]?.label ?? "?"}
                          </span>
                        )}
                      </div>
                      {q.topicName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {q.topicName}{q.subTopicName ? ` / ${q.subTopicName}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-300">
                          {q.marksAllocation} mark{q.marksAllocation !== 1 ? "s" : ""}
                        </span>
                        {(q.imageUrl || q.boardSnapshotUrl) && (
                          <span className="text-xs text-indigo-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Has image
                          </span>
                        )}
                      </div>
                    </div>
                    {(q.imageUrl || q.boardSnapshotUrl) && (
                      <div className="shrink-0 w-12 h-12 rounded-lg border border-slate-100 overflow-hidden bg-slate-50">
                        <img
                          src={q.imageUrl || q.boardSnapshotUrl || ""}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            {totalCount > 0
              ? `${selected.size} of ${totalCount} selected`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={handlePrevPage}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500 min-w-[4rem] text-center font-medium">
              {totalCount > 0 ? `${page} / ${totalPages}` : "—"}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={handleNextPage}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="h-10">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="h-10 bg-chestnut hover:bg-chestnut/90"
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""} Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectQuestionsModal;
