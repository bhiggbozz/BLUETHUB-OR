import TitleBar from "@/shared/title-bar";
import { Button, Dialog, DialogContent, DialogTitle } from "@bluethub/ui-kit";
import { questionService, type QuestionSummaryDto } from "@/services/question";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
// import { InlineMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const SubtopicQuestionList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const classroomId = searchParams.get("classroomId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const topicId = searchParams.get("topicId") ?? "";
  const subTopicId = searchParams.get("subTopicId") ?? "";
  const subTopicNameParam = searchParams.get("subTopicName") ?? "";
  const subjectNameParam = searchParams.get("subjectName") ?? "";

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionSummaryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionSummaryDto | null>(null);

  useEffect(() => {
    if (!classroomId || !subjectId || !topicId || !subTopicId) {
      setQuestions([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    questionService
      .getQuestionsByClassroomSubjectTopic(classroomId, subjectId, topicId, {
        page: 1,
        pageSize: 50,
        subTopicIds: subTopicId ? [subTopicId] : [],
      })
      .then((res) => {
        const raw = res.data as any;
        const payload = raw.data ?? raw.dat ?? raw;
        const items = (raw.questions ?? raw.dat?.questions ?? payload?.questions ?? []) as QuestionSummaryDto[];
        const total = (raw.totalCount ?? raw.dat?.totalCount ?? payload?.totalCount ?? items.length) as number;
        setQuestions(items);
        setTotalCount(total);
      })
      .catch(() => {
        setQuestions([]);
        setTotalCount(0);
        toast.error("Failed to load subtopic questions");
      })
      .finally(() => setLoading(false));
  }, [classroomId, subjectId, topicId, subTopicId]);

  const subTopicName = useMemo(() => {
    if (questions[0]?.subTopicName) return questions[0].subTopicName;
    return subTopicNameParam || "Selected Subtopic";
  }, [questions, subTopicNameParam]);

  const backToSubtopicsHref = useMemo(() => {
    const params = new URLSearchParams();
    if (classroomId) params.set("classroomId", classroomId);
    if (subjectId) params.set("subjectId", subjectId);
    if (topicId) params.set("topicId", topicId);

    const query = params.toString();
    return `/teacher/assessment/questionlist${query ? `?${query}` : ""}`;
  }, [classroomId, subjectId, topicId]);

  return (
    <div className="font-poppins">
      <div className="lg:rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-sm">
        <TitleBar title="question" hasVertical hasBackIcons onBack={() => navigate(-1)} />

        <div className="md:p-3 space-y-4">
          <div className="rounded-2xl border border-[#f3dccb] bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff] p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Subtopic Questions</p>
            <h1 className="text-base font-bold text-chestnut mt-1">{subTopicName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {subjectNameParam || questions[0]?.subjectName || "Subject"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-chestnut/10 text-chestnut text-xs font-semibold px-3 py-1.5">
                {totalCount} question{totalCount === 1 ? "" : "s"}
              </span>
              <Link
                to={backToSubtopicsHref}
                className="rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 hover:border-chestnut/50"
              >
                Back to Subtopics
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Questions</h2>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            {!loading && questions.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No saved questions found for this subtopic.
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {questions.map((question, idx) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setSelectedQuestion(question)}
                  className="w-full text-left px-4 py-3 sm:py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Question {idx + 1}</p>
                      <div className="text-sm font-semibold text-slate-700 leading-5 mt-0.5">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {(question.title || "Untitled question")
                            .replace(/\\\(/g, "$")
                            .replace(/\\\)/g, "$")}
                        </ReactMarkdown>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {question.topicName || question.topic || "No topic"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {question.questionTypeName || `Type ${question.questionType}`}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        {question.difficultyLevelName || `Level ${question.difficultyLevel}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{question.creationDate}</span>
                    <span>{question.statusName || `Status ${question.status}`}</span>
                  </div>

                  {/* Thumbnail preview */}
                  {(question.imageUrl || question.boardSnapshotUrl) && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        {question.imageUrl ? "Image" : "Board Snapshot"}
                      </span>
                      <img
                        src={question.imageUrl || question.boardSnapshotUrl || ""}
                        alt="Preview"
                        className="h-10 w-10 rounded-md object-cover border border-slate-200"
                        loading="lazy"
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
            <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
                <DialogTitle className="text-base font-semibold text-slate-800">Question Details</DialogTitle>
              </div>

              {selectedQuestion && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question</p>
                    <div className="text-sm font-semibold text-slate-700 leading-5 mt-0.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {(selectedQuestion.title || "Untitled question")
                          .replace(/\\\(/g, "$")
                          .replace(/\\\)/g, "$")}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Type: {selectedQuestion.questionTypeName || `Type ${selectedQuestion.questionType}`}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Difficulty: {selectedQuestion.difficultyLevelName || `Level ${selectedQuestion.difficultyLevel}`}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Topic: {selectedQuestion.topicName || selectedQuestion.topic || "No topic"}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Status: {selectedQuestion.statusName || `Status ${selectedQuestion.status}`}
                    </span>
                  </div>

                  {/* Image / Board Snapshot preview */}
                  {(selectedQuestion.imageUrl || selectedQuestion.boardSnapshotUrl) && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <p className="text-[11px] font-semibold text-slate-500 px-3 py-2 border-b border-slate-100 bg-white">
                        {selectedQuestion.imageUrl ? "Attached Image" : "Board Snapshot"}
                      </p>
                      <div className="flex items-center justify-center p-3">
                        <img
                          src={selectedQuestion.imageUrl || selectedQuestion.boardSnapshotUrl || ""}
                          alt="Question media"
                          className="max-w-full rounded-lg object-contain"
                          style={{ maxHeight: 320 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setSelectedQuestion(null)}
                      className="h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white px-4"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <div className="sm:hidden">
            <Button
              onClick={() => navigate(-1)}
              className="w-full h-11 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtopicQuestionList;
