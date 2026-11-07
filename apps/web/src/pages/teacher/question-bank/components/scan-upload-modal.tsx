/**
 * Scan Upload Modal - Mobile-first design
 * Full screen sheet on mobile, centered modal on desktop
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bluethub/ui-kit";
import { Button } from "@bluethub/ui-kit";
import {
  FileImage,
  FileText,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Camera,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { mediaUploadService, MediaType } from "@/services/media-upload";
import { questionJobService } from "@/services/question-job";
import { schoolService } from "@/services/school";
import { useAuthContext } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { compressImageForUpload } from "@/utils/image-compression";

// ── Types ────────────────────────────────────────────────────────────────────

interface ScanUploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassroomOption {
  id: string;
  name: string;
}

interface AssignmentPair {
  subjectId: string;
  subjectName: string;
  classroomId: string;
  className: string;
}

interface TopicOption {
  id: string;
  name: string;
}

interface SubTopicOption {
  id: string;
  name: string;
}

type UploadStep = "select" | "uploading" | "submitting" | "done" | "error";

// ── Component ────────────────────────────────────────────────────────────────

export default function ScanUploadModal({
  open,
  onClose,
  onComplete,
}: ScanUploadModalProps) {
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [assignmentPairs, setAssignmentPairs] = useState<AssignmentPair[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicId, setTopicId] = useState<string>("");
  const [subtopics, setSubtopics] = useState<SubTopicOption[]>([]);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [subtopicId, setSubtopicId] = useState<string>("");
  const [topicsData, setTopicsData] = useState<any[]>([]);
  const [questionType, setQuestionType] = useState<"Objective" | "Theory" | "TrueFalse">("Objective");
  const [step, setStep] = useState<UploadStep>("select");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // Load subjects from user's role data
  useEffect(() => {
    if (!user?.id) return;
    authService.getUserById(user.id).then((res) => {
      const roleData = (res.data as any)?.data?.roleData;
      const classrooms: any[] = roleData?.classrooms ?? [];
      const seenSubjects = new Set<string>();
      const seenPairs = new Set<string>();
      const subjectList: SubjectOption[] = [];
      const pairs: AssignmentPair[] = [];
      for (const [index, c] of classrooms.entries()) {
        const classroomId = c.classroomId;
        const className = String(c.className ?? `Classroom ${index + 1}`);
        if (!classroomId) continue;

        for (const s of (c.subjects ?? [])) {
          if (!s.subjectId || !s.subjectName) continue;

          if (!seenSubjects.has(s.subjectId)) {
            seenSubjects.add(s.subjectId);
            subjectList.push({ id: s.subjectId, name: s.subjectName });
          }

          const key = `${s.subjectId}_${classroomId}`;
          if (!seenPairs.has(key)) {
            seenPairs.add(key);
            pairs.push({
              subjectId: s.subjectId,
              subjectName: s.subjectName,
              classroomId,
              className,
            });
          }
        }
      }

      setAssignmentPairs(pairs);
      setSubjects(subjectList);

      if (subjectList.length === 1) {
        const onlySubject = subjectList[0].id;
        setSelectedSubject(onlySubject);

        const subjectClassrooms = pairs
          .filter((p) => p.subjectId === onlySubject)
          .map((p) => ({ id: p.classroomId, name: p.className }))
          .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

        setClassrooms(subjectClassrooms);
        if (subjectClassrooms.length === 1) {
          setSelectedClassroom(subjectClassrooms[0].id);
        }
      } else {
        setClassrooms([]);
      }
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSubject) {
      setClassrooms([]);
      setSelectedClassroom("");
      return;
    }

    const filteredClassrooms = assignmentPairs
      .filter((p) => p.subjectId === selectedSubject)
      .map((p) => ({ id: p.classroomId, name: p.className }))
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

    setClassrooms(filteredClassrooms);

    if (!filteredClassrooms.some((c) => c.id === selectedClassroom)) {
      setSelectedClassroom(filteredClassrooms.length === 1 ? filteredClassrooms[0].id : "");
    }
  }, [assignmentPairs, selectedSubject, selectedClassroom]);

  // Load curriculum topics when subject + classroom are set
  useEffect(() => {
    if (!selectedSubject || !selectedClassroom) {
      setTopics([]);
      setSubtopics([]);
      setTopicsData([]);
      setTopicId("");
      setSubtopicId("");
      return;
    }

    setTopicId("");
    setSubtopicId("");
    setTopics([]);
    setSubtopics([]);
    setTopicsData([]);
    setTopicsLoading(true);

    schoolService
      .getSubjectCurriculum(selectedSubject, selectedClassroom)
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
  }, [selectedSubject, selectedClassroom]);

  // Derive subtopics from the selected topic
  useEffect(() => {
    if (!topicId) {
      setSubtopics([]);
      setSubtopicId("");
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

  // Reset state when modal opens/closes
  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStep("select");
    setUploadProgress(0);
    setErrorMessage("");
    setSelectedClassroom("");
    setTopicId("");
    setSubtopicId("");
    setTopics([]);
    setSubtopics([]);
    setTopicsData([]);
    setQuestionType("Objective");
    if (subjects.length === 1) {
      const onlySubject = subjects[0].id;
      setSelectedSubject(onlySubject);

      const subjectClassrooms = assignmentPairs
        .filter((p) => p.subjectId === onlySubject)
        .map((p) => ({ id: p.classroomId, name: p.className }))
        .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

      setClassrooms(subjectClassrooms);
      if (subjectClassrooms.length === 1) {
        setSelectedClassroom(subjectClassrooms[0].id);
      }
    } else {
      setSelectedSubject("");
      setClassrooms([]);
    }
  }, [subjects, assignmentPairs]);

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open, resetState]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf",
    ];
    const isImage = file.type.startsWith("image/");
    // Images get compressed before upload, so the raw camera photo is allowed
    // to be much bigger than what actually gets sent. PDFs aren't compressed
    // (no client-side re-encoding path), so that cap stays tight.
    const maxSize = isImage ? 30 * 1024 * 1024 : 15 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return "Please upload an image (JPEG, PNG, HEIC) or PDF file.";
    }

    if (file.size > maxSize) {
      return isImage ? "Image must be less than 30MB." : "File size must be less than 15MB.";
    }

    return null;
  };

  // Handle file selection — images are downscaled/re-compressed first so a
  // large phone photo doesn't get rejected (413) by the upload target.
  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(null);
      return;
    }

    const toastId = "scan-img-compress";
    const isLarge = file.size > 4 * 1024 * 1024;
    if (isLarge) toast.loading("Optimizing photo for upload...", { id: toastId });

    const result = await compressImageForUpload(file);

    if (isLarge) {
      if (result.wasCompressed) {
        toast.success(
          `Photo optimized: ${(result.originalSize / 1024 / 1024).toFixed(1)}MB → ${(result.compressedSize / 1024 / 1024).toFixed(1)}MB`,
          { id: toastId }
        );
      } else {
        toast.dismiss(toastId);
      }
    }

    setSelectedFile(result.file);
    setPreviewUrl(URL.createObjectURL(result.file));
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  // Upload and submit
  const handleSubmit = async () => {
    if (!selectedFile || !selectedSubject || !selectedClassroom) return;

    try {
      setStep("uploading");
      setUploadProgress(0);

      // Upload file to Cloudinary
      const isImage = selectedFile.type.startsWith("image/");
      const mediaType = isImage ? MediaType.Image : MediaType.Document;

      // Pass a clean file name (no extension) so the backend issues a Cloudinary
      // public_id without an extension. Cloudinary derives the format from the file
      // type itself, keeping the secure_url to a single extension.
      const cleanFileName = selectedFile.name.replace(/\.[^.]+$/, "");

      const uploadResult = await mediaUploadService.upload(
        selectedFile,
        cleanFileName,
        mediaType,
        selectedFile.type,
        `Scan: ${selectedFile.name}`,
        (progress) => setUploadProgress(progress.percentage)
      );

      if (!uploadResult.success || !uploadResult.cdnUrl) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      setStep("submitting");

      // Never report a public_id that ends in an image/pdf extension — the backend
      // worker builds a download URL from it and Cloudinary would strip the trailing
      // extension as the "format", failing to resolve the resource.
      const cleanPublicId = (uploadResult.publicId || "").replace(
        /\.(jpe?g|png|webp|heic|heif|pdf)$/i,
        ""
      );

      // Submit scan job
   const formData = new FormData();
formData.append("subjectId", selectedSubject);
formData.append("classroomId", selectedClassroom);
formData.append("topicId", topicId);
formData.append("subTopicId", subtopicId);
formData.append("questionType", questionType);
formData.append("fileUrl", uploadResult.cdnUrl);
formData.append("filePublicId", cleanPublicId);
formData.append("fileType", isImage ? "image" : "pdf");

const jobResult = await questionJobService.submitJob(formData);

      if (jobResult.data.status !== "successful") {
        throw new Error("Failed to submit scan job");
      }

      setStep("done");

      // Auto close after success
      setTimeout(() => {
        onComplete();
        resetState();
      }, 1500);
    } catch (err) {
      console.error("Scan upload error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      setStep("error");
    }
  };

  // Handle close
  const handleClose = () => {
    if (step === "uploading" || step === "submitting") return;
    resetState();
    onClose();
  };

  const isImage = selectedFile?.type.startsWith("image/");
  const canSubmit = selectedFile && selectedSubject && selectedClassroom && topicId && subtopicId && questionType;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 gap-0 overflow-y-scroll",
          // Mobile: full screen sheet from bottom
          "fixed inset-x-0 bottom-0 top-auto translate-y-0 translate-x-0 left-0",
          "max-w-full rounded-t-3xl rounded-b-none max-h-[92vh]",
          // Desktop: centered modal
          "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:max-w-xl sm:rounded-3xl sm:max-h-[88vh]"
        )}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Scan Questions</h2>
              <p className="text-xs text-gray-500">Automatic extraction</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content based on step */}
        <div className="overflow-y-auto">
          {step === "select" && (
            <div className="p-5 sm:p-6 space-y-5">
              {/* Subject Selection */}
              {(subjects.length > 1 || assignmentPairs.length > 0) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Subject
                  </label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Classroom Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Classroom
                </label>
                <Select
                  value={selectedClassroom}
                  onValueChange={setSelectedClassroom}
                  disabled={!selectedSubject || classrooms.length === 0}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue
                      placeholder={
                        !selectedSubject
                          ? "Choose a subject first"
                          : classrooms.length === 0
                            ? "No classroom for selected subject"
                            : "Choose a classroom"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Topic
                </label>
                <Select
                  value={topicId}
                  onValueChange={setTopicId}
                  disabled={!selectedClassroom || topics.length === 0}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue
                      placeholder={
                        topicsLoading
                          ? "Loading topics..."
                          : !selectedClassroom
                            ? "Choose a classroom first"
                            : topics.length === 0
                              ? "No topics for selected subject"
                              : "Choose a topic"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subtopic Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Subtopic
                </label>
                <Select
                  value={subtopicId}
                  onValueChange={setSubtopicId}
                  disabled={!topicId || subtopics.length === 0}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue
                      placeholder={
                        subtopicsLoading
                          ? "Loading subtopics..."
                          : !topicId
                            ? "Choose a topic first"
                            : subtopics.length === 0
                              ? "No subtopics for selected topic"
                              : "Choose a subtopic"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subtopics.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question Type Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Question Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Objective", "Theory", "TrueFalse"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuestionType(type)}
                      className={cn(
                        "h-11 rounded-xl text-sm font-semibold border-2 transition-all",
                        questionType === type
                          ? "border-purple-600 bg-purple-50 text-purple-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      )}
                    >
                      {type === "TrueFalse" ? "True/False" : type}
                    </button>
                  ))}
                </div>
              </div>

              {assignmentPairs.length === 0 && (
                <div className="flex items-start gap-3 text-amber-700 text-sm bg-amber-50 px-4 py-3 rounded-xl">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>No assigned subject/classroom found for your account.</span>
                </div>
              )}

              {/* File Selection */}
              {!selectedFile ? (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 block">
                    Upload Question Image
                  </label>

                  {/* Upload Options */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Camera */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-5 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-dashed border-purple-200 active:scale-[0.98] transition-transform"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Camera className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-purple-700">
                        Take Photo
                      </span>
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleInputChange}
                      className="hidden"
                    />

                    {/* File Browser */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-5 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200 active:scale-[0.98] transition-transform"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gray-600 flex items-center justify-center shadow-lg shadow-gray-500/20">
                        <FolderOpen className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        Browse Files
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                  </div>

                  <p className="text-center text-xs text-gray-400 pt-1">
                    Supports JPEG, PNG, HEIC, PDF • Photos are optimized automatically • PDF max 15MB
                  </p>
                </div>
              ) : (
                // File Preview
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700 block">
                    Selected File
                  </label>

                  <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-52 sm:h-60 object-cover"
                      />
                    ) : (
                      <div className="w-full h-52 sm:h-60 flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">PDF Document</span>
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      {isImage ? (
                        <FileImage className="w-5 h-5 text-purple-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "w-full h-14 rounded-xl font-bold text-base",
                  "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800",
                  "shadow-lg shadow-purple-500/30",
                  "disabled:opacity-50 disabled:shadow-none"
                )}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Extract Questions
              </Button>
            </div>
          )}

          {/* Uploading State */}
          {step === "uploading" && (
            <div className="p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px]">
              <div className="relative w-24 h-24 mb-6">
                {/* Progress Ring */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#E9D5FF"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#9333EA"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-700">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
              <p className="font-semibold text-gray-900 text-lg">Uploading...</p>
              <p className="text-gray-500 text-sm mt-1">Please wait</p>
            </div>
          )}

          {/* Submitting State */}
          {step === "submitting" && (
            <div className="p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mb-5">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
              </div>
              <p className="font-semibold text-gray-900 text-lg">Processing...</p>
              <p className="text-gray-500 text-sm mt-1">Starting automatic extraction</p>
            </div>
          )}

          {/* Success State */}
          {step === "done" && (
            <div className="p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900 text-lg">Submitted!</p>
              <p className="text-gray-500 text-sm mt-1 text-center">
                We'll notify you when extraction is complete
              </p>
            </div>
          )}

          {/* Error State */}
          {step === "error" && (
            <div className="p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-5">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <p className="font-semibold text-gray-900 text-lg">Upload Failed</p>
              <p className="text-red-600 text-sm mt-1 text-center px-4">
                {errorMessage}
              </p>
              <Button
                onClick={() => setStep("select")}
                variant="outline"
                className="mt-5 rounded-xl"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
