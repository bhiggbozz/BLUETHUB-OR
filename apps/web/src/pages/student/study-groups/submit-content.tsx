import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Button, Label, Textarea } from "@bluethub/ui-kit";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  File as FileIcon,
  FileAudio,
  FileImage,
  FileVideo,
  Loader2,
  PenLine,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { schoolService } from "@/services/school";
import { lessonService, resolveMediaType, type CloudinarySignature, type SupabaseUploadToken } from "@/services/lesson";
import { groupService, type GroupContentMediaFile } from "@/services/groups";
import { runConcurrent, uploadToCloudinary, uploadToSupabase } from "@/utils/media-upload-helpers";
import { launchStudentBoard } from "@/utils/launch-student-board";

const UPLOAD_CONCURRENCY = 2;

interface SelectItem {
  id: string;
  label: string;
}

interface UploadFile {
  uid: string;
  file: File;
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: GroupContentMediaFile;
}

interface SubmittedContent {
  contentId: string;
  subjectId: string;
  subjectName: string;
  subTopic: string;
}

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("video/")) return <FileVideo className="w-4 h-4 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="w-4 h-4 text-blue-500" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-4 h-4 text-emerald-500" />;
  return <FileIcon className="w-4 h-4 text-gray-400" />;
}

const SubmitContentPage = () => {
  const { groupId = "" } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const groupDetailPath = `/student/study-groups/${groupId}`;

  const [groupName, setGroupName] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [groupLoadError, setGroupLoadError] = useState("");

  const [submittedContent, setSubmittedContent] = useState<SubmittedContent | null>(null);
  const [subjects, setSubjects] = useState<SelectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectId, setSubjectId] = useState("");

  const [topics, setTopics] = useState<SelectItem[]>([]);
  const [topicsData, setTopicsData] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicId, setTopicId] = useState("");

  const [subTopics, setSubTopics] = useState<string[]>([]);
  const [subTopic, setSubTopic] = useState("");

  const [aim, setAim] = useState("");
  const [description, setDescription] = useState("");
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"approval" | "board" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!groupId) return;
    setLoadingGroup(true);
    setGroupLoadError("");
    groupService
      .getGroupDetail(groupId)
      .then((res) => {
        const data = res.data?.data;
        if (!data) { setGroupLoadError("This group couldn't be found."); return; }
        setGroupName(data.name);
        setClassroomId(data.classroomId);
      })
      .catch((err) => {
        const status = err instanceof AxiosError ? err.response?.status : undefined;
        if (status === 403) setGroupLoadError("You're not a member of this group.");
        else if (status === 404) setGroupLoadError("This group couldn't be found.");
        else setGroupLoadError(extractMsg(err, "Couldn't load this group."));
      })
      .finally(() => setLoadingGroup(false));
  }, [groupId]);

  useEffect(() => {
    if (!classroomId) return;
    setLoadingSubjects(true);
    schoolService
      .getSubjectsByClassroomId(classroomId)
      .then((res) => {
        const data = (res.data as any)?.data;
        const all = [...(data?.majorSubjects ?? []), ...(data?.minorSubjects ?? [])];
        setSubjects(
          all.map((s: any) => ({
            id: String(s.id ?? s.subjectId ?? ""),
            label: String(s.subject ?? s.subjectName ?? s.name ?? ""),
          }))
        );
      })
      .catch(() => toast.error("Could not load subjects"))
      .finally(() => setLoadingSubjects(false));
  }, [classroomId]);

  useEffect(() => {
    if (!subjectId || !classroomId) {
      setTopics([]); setTopicsData([]);
      return;
    }
    setTopicId(""); setSubTopic(""); setSubTopics([]);
    setLoadingTopics(true);
    schoolService
      .getSubjectCurriculum(subjectId, classroomId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
        const t: any[] = raw.Topics ?? raw.topics ?? [];
        setTopicsData(t);
        setTopics(t.map((item: any) => ({
          id: String(item.Id ?? item.id ?? item.topicId),
          label: String(item.Name ?? item.name ?? item.topicName ?? ""),
        })));
      })
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  }, [subjectId, classroomId]);

  useEffect(() => {
    setSubTopic("");
    if (!topicId) { setSubTopics([]); return; }
    const matched = topicsData.find((t: any) => String(t.Id ?? t.id ?? t.topicId) === topicId);
    const subs = (matched?.SubTopics ?? matched?.subTopics ?? []).map((s: any) => String(s.Name ?? s.name ?? "")).filter(Boolean);
    setSubTopics(subs);
  }, [topicId, topicsData]);

  const handleFiles = async (fileList: FileList) => {
    const incoming: UploadFile[] = Array.from(fileList).map((file) => ({
      uid: uuidv4(), file, status: "idle", progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...incoming]);

    await runConcurrent(incoming, UPLOAD_CONCURRENCY, async ({ uid, file }) => {
      setUploadFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: "uploading" } : f)));
      const onProgress = (pct: number) =>
        setUploadFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, progress: pct } : f)));

      try {
        const isPdf = file.type === "application/pdf";
        let result: GroupContentMediaFile;

        if (isPdf) {
          const r = await lessonService.getSupabaseUploadToken(file.name || "group-content");
          const sig = ((r.data as any)?.data ?? r.data) as SupabaseUploadToken;
          const res = await uploadToSupabase(file, sig, onProgress);
          result = {
            fileName: file.name,
            originalFileName: file.name,
            fileExtension: "pdf",
            cloudinaryUrl: res.publicUrl,
            publicId: res.bucketPath,
            fileSizeBytes: file.size,
            displayOrder: uploadFiles.length + 1,
          };
        } else {
          const r = await lessonService.getUploadSignature(resolveMediaType(file.type) as any);
          const sig = (r.data as any).data as CloudinarySignature;
          const res = await uploadToCloudinary(file, sig, onProgress);
          const ext = res.format || file.name.split(".").pop() || "";
          result = {
            fileName: `${res.original_filename}.${ext}`,
            originalFileName: file.name,
            fileExtension: ext,
            cloudinaryUrl: res.secure_url,
            publicId: res.public_id,
            fileSizeBytes: res.bytes,
            displayOrder: uploadFiles.length + 1,
            ...(res.duration != null ? { duration: Math.round(res.duration) } : {}),
          };
        }

        setUploadFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: "done", progress: 100, result } : f)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadFiles((prev) => prev.map((f) => (f.uid === uid ? { ...f, status: "error", error: msg } : f)));
      }
    });
  };

  const removeFile = (uid: string) => setUploadFiles((prev) => prev.filter((f) => f.uid !== uid));

  const uploading = uploadFiles.some((f) => f.status === "uploading" || f.status === "idle");
  const canSubmit = subjectId && aim.trim() && description.trim() && !uploading;

  const handleSubmit = async (thenRecordBoard: boolean) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmittingAction(thenRecordBoard ? "board" : "approval");
    setErrorMsg("");
    try {
      const mediaFiles = uploadFiles.filter((f) => f.status === "done" && f.result).map((f) => f.result!);
      const res = await groupService.submitGroupContent(groupId, {
        subjectId,
        topicId: topicId || null,
        subTopic: subTopic.trim() || null,
        aim: aim.trim(),
        description: description.trim(),
        mediaFiles,
      });
      const subjectName = subjects.find((s) => s.id === subjectId)?.label ?? "";

      if (thenRecordBoard) {
        toast.success("Content saved — opening the board...");
        // No status check here — this content was just created in the call
        // above, so we already know for certain it has no recording yet.
        // Checking would always come back PendingApproval (the content we
        // just made) and block the recording from ever opening.
        launchStudentBoard(
          navigate,
          {
            contentId: res.data.data.contentId,
            groupId,
            aim: aim.trim(),
            subjectId,
            subjectName,
            classroomId,
            groupName,
            subTopic: subTopic.trim(),
          },
          groupDetailPath
        );
        return;
      }

      toast.success("Content submitted — pending your class teacher's approval.");
      setSubmittedContent({
        contentId: res.data.data.contentId,
        subjectId,
        subjectName,
        subTopic: subTopic.trim(),
      });
    } catch (err) {
      setErrorMsg(extractMsg(err, "Failed to submit content."));
    } finally {
      setSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleRecordBoard = () => {
    if (!submittedContent) return;
    const content = submittedContent;
    // Same reasoning as above — this content was created earlier in this
    // same page visit, so we know its recording slot is still empty.
    launchStudentBoard(
      navigate,
      {
        contentId: content.contentId,
        groupId,
        aim,
        subjectId: content.subjectId,
        subjectName: content.subjectName,
        classroomId,
        groupName,
        subTopic: content.subTopic,
      },
      groupDetailPath
    );
  };

  if (loadingGroup) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#6B6B85]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-xs">Loading group...</p>
      </div>
    );
  }

  if (groupLoadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <AlertCircle className="w-8 h-8 text-red-300" />
        <p className="text-sm font-medium text-[#3A3A3A]">{groupLoadError}</p>
      </div>
    );
  }

  return (
    <div className="font-Poppins min-h-screen pb-10">
      <button
        type="button"
        onClick={() => navigate(groupDetailPath)}
        className="flex items-center gap-1 text-xs text-[#6B6B85] hover:text-student-chestnut transition-colors mb-3 px-2 lg:px-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {groupName || "Group"}
      </button>

      <div className="max-w-3xl mx-auto lg:rounded-2xl overflow-hidden border border-white/20 bg-white/80 backdrop-blur-sm">
        <div className="bg-gradient-to-r from-student-chestnut to-student-chestnut/90 px-5 sm:px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Share Study Content</h1>
            <p className="text-white/70 text-xs mt-0.5">{groupName}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {submittedContent ? (
            <div className="flex flex-col items-center text-center gap-4 py-10">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">Content submitted</p>
                <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
                  It's pending your class teacher's approval. Want to add a whiteboard explanation too?
                </p>
              </div>
              <div className="flex gap-2.5 w-full max-w-xs">
                <Button
                  type="button"
                  onClick={() => navigate(groupDetailPath)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold text-sm"
                >
                  Done
                </Button>
                <Button
                  type="button"
                  onClick={handleRecordBoard}
                  className="flex-1 h-11 rounded-lg bg-student-chestnut hover:bg-student-chestnut/90 text-white font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <PenLine className="w-4 h-4" /> Record Board
                </Button>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3.5 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Subject *</Label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={loadingSubjects}
                    className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-student-chestnut/20 bg-white disabled:bg-gray-50"
                  >
                    <option value="">{loadingSubjects ? "Loading..." : "Select subject"}</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Topic</Label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    disabled={!subjectId || loadingTopics}
                    className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-student-chestnut/20 bg-white disabled:bg-gray-50"
                  >
                    <option value="">{loadingTopics ? "Loading..." : subjectId ? "Select topic" : "Select subject first"}</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Sub-topic</Label>
                {subTopics.length > 0 ? (
                  <select
                    value={subTopic}
                    onChange={(e) => setSubTopic(e.target.value)}
                    className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-student-chestnut/20 bg-white"
                  >
                    <option value="">None</option>
                    {subTopics.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input
                    value={subTopic}
                    onChange={(e) => setSubTopic(e.target.value.slice(0, 200))}
                    placeholder={topicId ? "Type a sub-topic (optional)" : "Select a topic first"}
                    disabled={!topicId}
                    className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-student-chestnut/20 disabled:bg-gray-50"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Aim *</Label>
                <input
                  value={aim}
                  onChange={(e) => setAim(e.target.value.slice(0, 500))}
                  placeholder="What is this content about?"
                  className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-student-chestnut/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Explain it to your group..."
                  rows={6}
                  className="text-sm"
                />
                <p className="text-[10px] text-gray-400 text-right">{description.length}/2000</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Media (optional)</Label>
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-student-chestnut/40 hover:bg-student-chestnut/5 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to attach audio, video, images, or PDFs</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
                  />
                </label>

                {uploadFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {uploadFiles.map((f) => (
                      <div key={f.uid} className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2.5">
                        {fileIcon(f.file.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{f.file.name}</p>
                          {f.status === "uploading" && (
                            <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-student-chestnut transition-all" style={{ width: `${f.progress}%` }} />
                            </div>
                          )}
                          {f.status === "error" && <p className="text-[10px] text-red-500 mt-0.5">{f.error}</p>}
                        </div>
                        {f.status === "uploading" ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
                        ) : (
                          <button type="button" onClick={() => removeFile(f.uid)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 bg-student-chestnut/5 border border-student-chestnut/15 rounded-xl px-4 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-student-chestnut/10 flex items-center justify-center shrink-0">
                  <PenLine className="w-4 h-4 text-student-chestnut" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Whiteboard recording</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Want to explain this with drawings and your voice? Choose "Save &amp; Record Board" below —
                    it saves this content, then opens the whiteboard right away.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 h-11 rounded-lg border border-student-chestnut/30 bg-white hover:bg-student-chestnut/5 text-student-chestnut font-semibold text-sm"
                >
                  {submittingAction === "approval" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {submittingAction === "approval" ? "Submitting..." : uploading ? "Waiting for uploads..." : "Submit for Approval"}
                </Button>
                <Button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={() => handleSubmit(true)}
                  className="flex-1 h-11 rounded-lg bg-student-chestnut hover:bg-student-chestnut/90 text-white font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  {submittingAction === "board" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                  {submittingAction === "board" ? "Saving..." : "Save & Record Board"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitContentPage;
