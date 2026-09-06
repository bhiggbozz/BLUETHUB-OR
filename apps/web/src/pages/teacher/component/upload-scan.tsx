import TitleBar from "@/shared/title-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { CheckCircle2, ChevronDown, FileText, ImagePlus, Loader2, Upload } from "lucide-react";
import { schoolService } from "@/services/school";
import { questionJobService, type JobQuestionType } from "@/services/question-job";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";

// ── Types ──────────────────────────────────────────────────────────────────
interface Subject { id: string; name: string; }
interface Classroom { id: string; name: string; }
interface TopicOption { id: string; name: string; }
interface SubTopicOption { id: string; name: string; }

// ── Small helpers ──────────────────────────────────────────────────────────
const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Sel = ({
  value, options, placeholder, onSelect, loading, disabled,
}: {
  value: string; options: { id: string; name: string }[];
  placeholder: string; onSelect: (id: string) => void;
  loading?: boolean; disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-black/15 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-400 transition-colors"
      >
        <span className={selected ? "text-slate-700 font-medium" : "text-slate-400"}>
          {loading ? "Loading…" : selected?.name || placeholder}
        </span>
        {loading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-black/10 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <div className="py-3 text-center text-sm text-slate-400">No options</div>
          ) : options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onSelect(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${value === o.id ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
const UploadScan = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, isLoading: authLoading, refreshUser } = useAuthContext();

  // Cascade state
  const [classroomId, setClassroomId] = useState("");

  const [subjectId, setSubjectId] = useState("");

  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicId, setTopicId] = useState("");

  const [subtopics, setSubtopics] = useState<SubTopicOption[]>([]);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [subtopicId, setSubtopicId] = useState("");
  const [topicsData, setTopicsData] = useState<any[]>([]);

  // Form fields
  const [questionType, setQuestionType] = useState<JobQuestionType>("Objective");
  const [hasImages, setHasImages] = useState(false);
  const [marksAllocation, setMarksAllocation] = useState(1);

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  const classrooms = useMemo<Classroom[]>(() => {
    const roleData = user?.roleData;
    if (!roleData || !isTeacherRoleData(roleData)) return [];
    return roleData.classrooms.map((item) => ({
      id: String(item.classroomId),
      name: String(item.className),
    }));
  }, [user?.roleData]);

  const subjects = useMemo<Subject[]>(() => {
    const roleData = user?.roleData;
    if (!roleData || !isTeacherRoleData(roleData)) return [];
    const selectedClassroom = roleData.classrooms.find(
      (item) => String(item.classroomId) === classroomId
    );
    return (selectedClassroom?.subjects ?? []).map((item) => ({
      id: String(item.subjectId),
      name: String(item.subjectName),
    }));
  }, [user?.roleData, classroomId]);

  useEffect(() => {
    if (!authLoading) {
      void refreshUser();
    }
  }, [authLoading]);

  useEffect(() => {
    if (classroomId && !classrooms.some((item) => item.id === classroomId)) {
      setClassroomId("");
      setSubjectId("");
      setTopicId("");
      setSubtopicId("");
      setTopics([]);
      setSubtopics([]);
    }
  }, [classroomId, classrooms]);

  useEffect(() => {
    if (subjectId && !subjects.some((item) => item.id === subjectId)) {
      setSubjectId("");
      setTopicId("");
      setSubtopicId("");
      setTopics([]);
      setSubtopics([]);
      setTopicsData([]);
    }
  }, [subjectId, subjects]);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setSubtopics([]);
      setTopicsData([]);
      return;
    }

    setTopicId("");
    setSubtopicId("");
    setTopics([]);
    setSubtopics([]);
    setTopicsData([]);
    setTopicsLoading(true);

    schoolService
      .getSubjectCurriculum(subjectId, classroomId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
        const nextTopics: any[] = raw.Topics ?? raw.topics ?? [];

        setTopicsData(nextTopics);
        setTopics(
          nextTopics.map((t: any) => ({
            id: String(t.Id ?? t.id ?? t.topicId ?? ""),
            name: String(t.Name ?? t.name ?? t.topicName ?? ""),
          }))
        );
      })
      .catch(() => {
        setTopics([]);
        toast.error("Could not load topics");
      })
      .finally(() => setTopicsLoading(false));
  }, [subjectId]);

  useEffect(() => {
    if (!topicId) {
      setSubtopics([]);
      return;
    }

    setSubtopicsLoading(true);
    setSubtopicId("");

    const matched = topicsData.find(
      (t: any) => String(t.Id ?? t.id ?? t.topicId) === topicId
    );

    const nextSubtopics: SubTopicOption[] = (matched?.SubTopics ?? matched?.subTopics ?? []).map((s: any) => ({
      id: String(s.Id ?? s.id ?? s.subTopicId ?? ""),
      name: String(s.Name ?? s.name ?? s.subTopicName ?? ""),
    }));

    setSubtopics(nextSubtopics);
    setSubtopicsLoading(false);
  }, [topicId, topicsData]);

  const handleClassroomChange = async (id: string) => {
    setClassroomId(id);
    setSubjectId("");
    setTopicId("");
    setSubtopicId("");
    setTopics([]);
    setSubtopics([]);
    setTopicsData([]);
  };

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    setTopicId("");
    setSubtopicId("");
    setTopics([]);
    setSubtopics([]);
    setTopicsData([]);
  };

  const handleTopicChange = (id: string) => {
    setTopicId(id);
    setSubtopicId("");
    setSubtopics([]);
  };

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!imageFile) missing.push("file");
    if (!classroomId) missing.push("classroom");
    if (!subjectId) missing.push("subject");
    if (!topicId) missing.push("topic");
    if (!subtopicId) missing.push("sub-topic");
    return missing;
  }, [imageFile, classroomId, subjectId, topicId, subtopicId]);

  // ── Image pick ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const lowerName = file.name.toLowerCase();
    const lowerType = (file.type || "").toLowerCase();
    const hasKnownDocMime =
      lowerType.includes("pdf") ||
      lowerType.includes("word") ||
      lowerType.includes("officedocument") ||
      lowerType === "application/octet-stream";
    const hasAllowedExtension =
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".webp") ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".doc") ||
      lowerName.endsWith(".docx");

    if (!allowed.includes(file.type) && !hasAllowedExtension && !hasKnownDocMime) {
      toast.error("Only image, PDF, DOC and DOCX files are supported");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20 MB");
      return;
    }

    setImageFile(file);

    const isImage = file.type.startsWith("image/") || /(\.jpg|\.jpeg|\.png|\.webp)$/i.test(file.name);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }

    e.target.value = "";
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!imageFile) { toast.error("Select an image first"); return; }
    if (!classroomId) { toast.error("Select a classroom"); return; }
    if (!subjectId) { toast.error("Select a subject"); return; }
    if (!topicId) { toast.error("Select a topic"); return; }
    if (!subtopicId) { toast.error("Select a sub-topic"); return; }
    if (marksAllocation < 1) { toast.error("Marks must be at least 1"); return; }

    const form = new FormData();
    // Send both keys for backward compatibility with existing backend binders.
    form.append("image", imageFile);
    form.append("file", imageFile);
    form.append("ClassroomId", classroomId);
    form.append("SubjectId", subjectId);
    form.append("TopicId", topicId);
    form.append("SubTopicId", subtopicId);
    form.append("QuestionType", questionType);
    form.append("HasImages", String(hasImages));
    form.append("MarksAllocation", String(marksAllocation));

    setSubmitting(true);
    try {
      const { data } = await questionJobService.submitJob(form);
      const jobId = data.data?.jobId ?? (data as any).jobId;
      setSubmittedJobId(jobId);
      toast.success("Your request is being processed at the moment.");
    } catch (err) {
      const e = err as AxiosError<{ responseMessage?: string }>;
      toast.error(e.response?.data?.responseMessage ?? e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (submittedJobId) {
    return (
      <div className="md:p-3 lg:p-6 font-poppins ">
        <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20 overflow-hidden">
          <TitleBar title="Upload and scan" hasVertical hasBackIcons />
          <div className="p-3 md:p-6 lg:p-8 bg-white/70 h-[70vh] lg:h-auto backdrop-blur-sm flex flex-col items-center gap-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <div> 
              <h2 className="text-xl font-bold text-slate-800">Request Accepted</h2>
              <p className="text-sm text-slate-500 mt-1">Your request is being processed at the moment.</p>
              <p className="text-sm text-slate-500 mt-1">A background process will pick it from the database and update the status when processing is complete.</p>
              <p className="text-xs text-slate-400 mt-2 font-mono">Job ID: {submittedJobId}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setSubmittedJobId(null); setImageFile(null); setImagePreview(null); }}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Upload Another
              </button>
              <button
                onClick={() => navigate("/teacher/assessments/My-Uploads")}
                className="px-5 py-2.5 rounded-lg bg-chestnut text-white text-sm font-semibold hover:bg-chestnut/90 transition-colors"
              >
                Check Processing Status →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20 overflow-hidden">
        <TitleBar title="Upload and scan" hasVertical hasBackIcons onBack={() => navigate(-1)} />

        <div className="p-3 sm:p-4 bg-white/70 backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-sm font-bold text-slate-800">
              Question Scanner
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload a question file (image, PDF, DOC or DOCX) — questions will be extracted and formatted for you
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── LEFT: File upload ─────────────────────────────── */}
            <div className="flex-1 flex flex-col gap-4">
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />

              {imageFile && imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50" style={{ minHeight: 280 }}>
                  <img
                    src={imagePreview}
                    alt="Question"
                    className="w-full h-full object-contain"
                    style={{ maxHeight: 400, display: "block", margin: "0 auto" }}
                  />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    Change image
                  </button>
                </div>
              ) : imageFile ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6" style={{ minHeight: 280 }}>
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <FileText size={42} className="text-indigo-300" />
                    <p className="text-sm font-semibold text-slate-700 break-all max-w-full">{imageFile.name}</p>
                    <p className="text-xs text-slate-400">{(imageFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="mt-1 bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Change file
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 cursor-pointer"
                  style={{ minHeight: 280 }}
                >
                  <ImagePlus size={40} className="text-indigo-300" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-indigo-500">Click to upload question file</p>
                    <p className="text-xs text-slate-400 mt-1">JPEG · PNG · WebP · PDF · DOC · DOCX — max 20 MB</p>
                  </div>
                </button>
              )}
            </div>

            {/* ── RIGHT: Form fields ─────────────────────────────── */}
            <div className="lg:w-80 shrink-0 flex flex-col gap-4">

              {/* Classroom */}
              <Field label="Classroom" required>
                <Sel
                  value={classroomId}
                  options={classrooms}
                  placeholder="Select classroom"
                  onSelect={handleClassroomChange}
                  loading={authLoading}
                  disabled={false}
                />
              </Field>

              {/* Subject */}
              <Field label="Subject" required>
                <Sel
                  value={subjectId}
                  options={subjects}
                  placeholder={classroomId ? "Select subject" : "Select classroom first"}
                  onSelect={handleSubjectChange}
                  loading={authLoading}
                  disabled={!classroomId}
                />
              </Field>

              {/* Topic */}
              <Field label="Topic" required>
                <Sel
                  value={topicId}
                  options={topics}
                  placeholder={subjectId ? "Select topic" : "Select subject first"}
                  onSelect={handleTopicChange}
                  loading={topicsLoading}
                  disabled={!subjectId}
                />
              </Field>

              {/* Sub-topic */}
              <Field label="Sub-topic" required>
                <Sel
                  value={subtopicId}
                  options={subtopics}
                  placeholder={topicId ? "Select sub-topic" : "Select topic first"}
                  onSelect={setSubtopicId}
                  loading={subtopicsLoading}
                  disabled={!topicId}
                />
              </Field>

              {/* Question Type */}
              <Field label="Question Type" required>
                <div className="flex gap-2">
                  {(["Objective", "Theory", "TrueFalse"] as JobQuestionType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuestionType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer ${questionType === t
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                    >
                      {t === "TrueFalse" ? "True/False" : t}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Marks */}
              <Field label="Marks Allocation" required>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={marksAllocation}
                  onChange={e => setMarksAllocation(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-black/15 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                />
              </Field>

              {/* Has Images */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasImages}
                  onChange={e => setHasImages(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-600">
                  Question contains images / diagrams
                </span>
              </label>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !imageFile || !classroomId || !subjectId || !topicId || !subtopicId}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-md bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold transition-all cursor-pointer mt-2"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                ) : (
                  <><Upload size={16} /> Submit for Processing</>
                )}
              </button>

              {missingFields.length > 0 && (
                <p className="text-xs text-amber-600">
                  To enable submit, select: {missingFields.join(", ")}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadScan;
