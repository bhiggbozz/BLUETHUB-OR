import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getAllSessions, cleanupEntireSession } from "@/utils/db";
import type { LocalSession } from "@/utils/constant";
import {
  Clock,
  Calendar,
  BookOpen,

  Play,
  Trash2,
  Upload,
  FileText,
  MoreVertical,
  Search,
  Filter,
  ChevronRight,
  Mic,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Timer,
  CalendarClock,
  Menu,
} from "lucide-react";
import toast from "react-hot-toast";

type DraftSession = LocalSession;

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
    icon: FileText,
  },
  completed: {
    label: "Ready to Upload",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
    icon: Upload,
  },
  recording: {
    label: "Recording",
    color: "bg-red-100 text-red-700 border-red-200",
    dotColor: "bg-red-500",
    icon: Mic,
  },
  paused: {
    label: "Paused",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    dotColor: "bg-gray-500",
    icon: Clock,
  },
  publishing: {
    label: "Uploading",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dotColor: "bg-purple-500",
    icon: Loader2,
  },
  published: {
    label: "Published",
    color: "bg-green-100 text-green-700 border-green-200",
    dotColor: "bg-green-500",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700 border-red-200",
    dotColor: "bg-red-500",
    icon: AlertCircle,
  },
};

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

function getDraftTitle(session: DraftSession): string {
  const lessonAny = session.lesson as DraftSession["lesson"] & { subTopicName?: string };
  const subTopicName = lessonAny.subTopicName?.trim();
  const subTopic = session.lesson.subTopic?.trim();

  if (subTopicName) return subTopicName;
  if (subTopic) return subTopic;
  return "No subtopic";
}

export default function DraftLessons() {
  const navigate = useNavigate();
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [sessions, setSessions] = useState<DraftSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const allSessions = await getAllSessions();

      // Filter out published sessions
      const draftSessions = allSessions.filter((s) => s.status !== "published");

      // Sort by most recent first
      draftSessions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setSessions(draftSessions);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = (session: DraftSession) => {
    console.log('[Drafts] Continuing session:', session.id, 'duration:', session.recording.totalDurationMs);
    localStorage.setItem("continueSessionId", session.id);
    localStorage.setItem("continueLessonId", session.lessonId);
    navigate("/teacher/board");
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await cleanupEntireSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Draft deleted");
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Failed to delete draft");
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const title = getDraftTitle(session);
    const matchesSearch =
      searchQuery === "" ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lesson.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lesson.subTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lesson.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lesson.className.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === "all" || session.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading your drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
  <div className="flex items-center gap-3">
    <Menu className="lg:hidden w-5 h-5 text-black cursor-pointer" onClick={openMobileNav} />
    <h1 className="text-base font-semibold text-gray-900 sm:text-xl">
      My Drafts
    </h1>
  </div>
  <p className="mt-1 text-sm text-gray-500">
    Continue recording or upload your saved lessons
  </p>
</div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-chestnut">
                {sessions.length} {sessions.length === 1 ? "draft" : "drafts"}
              </span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by topic, subject, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
  <Filter className="h-4 w-4 text-gray-400 shrink-0" />
  <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
  >
    <option value="all">All Status</option>
    <option value="draft">Drafts</option>
    <option value="completed">Ready to Upload</option>
    <option value="failed">Failed</option>
  </select>
</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No drafts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter"
                : "Start a new class to create your first draft"}
            </p>
            <button
              onClick={() => navigate("/teacher/start-class")}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-chestnut px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Play className="h-4 w-4" />
              Start New Class
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => {
              const status = statusConfig[session.status] || statusConfig.draft;
              const StatusIcon = status.icon;

              return (
                <div
                  key={session.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5"
                >
                  {/* Colored top bar based on status */}
                  <div className={`h-1.5 w-full ${status.dotColor}`} />

                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Subject Badge */}
                      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">
                          {session.lesson.subjectName}
                        </span>
                      </div>

                      {/* Action Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === session.id ? null : session.id);
                          }}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenuOpen === session.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  handleContinue(session);
                                  setActionMenuOpen(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Play className="h-4 w-4" />
                                Continue
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirm(session.id);
                                  setActionMenuOpen(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Topic */}
                    <h3 className="mt-3 text-lg font-bold text-gray-900 line-clamp-2">
                      {getDraftTitle(session)}
                    </h3>

                    {/* Class Info */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-sm">{session.lesson.className}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Time Recorded */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Timer className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium uppercase tracking-wide">Recorded</span>
                        </div>
                        <span className="mt-1 text-lg font-bold text-gray-900">
                          {formatDuration(session.recording.totalDurationMs)}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium uppercase tracking-wide">Status</span>
                        </div>
                        <span className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${status.color.split(' ')[1]}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dotColor}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Section */}
                  <div className="border-t border-gray-100 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>{formatTime(session.createdAt)}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        {getRelativeTime(session.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="border-t border-gray-100 px-5 py-4">
                    <button
                      onClick={() => handleContinue(session)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md"
                    >
                      <Play className="h-4 w-4" />
                      Continue Recording
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Delete Draft?</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete all audio recordings and board data for this
                  lesson. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
