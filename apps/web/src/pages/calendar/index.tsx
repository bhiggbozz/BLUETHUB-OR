import { useEffect, useState } from "react";
import { AlertCircle, CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { AxiosError } from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@bluethub/ui-kit";
import type { RootState } from "@/store";
import { useAuthContext } from "@/contexts/auth-context";
import { parentService, type ParentChild } from "@/services/parent";
import { removeSession, selectSession, setSessions, upsertSession, setEntries, upsertEntry, removeEntry } from "@/store/calendar-slice";
import calendarService, {
  type CalendarEntryDto,
  type CalendarEntryTypeDto,
  type CalendarSessionDto,
  type CalendarTermDto,
} from "@/services/calendar";
import { useCanManageCalendar } from "./hooks/use-can-manage-calendar";
import { useEntryWriteAccess } from "./hooks/use-entry-write-access";
import { formatDisplayRange, MAX_TERMS, pickDefaultSession } from "./utils";
import StatusChip from "./components/status-chip";
import SessionSwitcher from "./components/session-switcher";
import YearTimeline from "./components/year-timeline";
import TermCard from "./components/term-card";
import CalendarEmptyState from "./components/empty-state";
import EditYearModal from "./components/edit-year-modal";
import TermModal from "./components/term-modal";
import DeleteTermDialog from "./components/delete-term-dialog";
import DeleteYearDialog from "./components/delete-year-dialog";
import ChildSwitcher from "./components/child-switcher";
import EntryModal, { type EntryModalMode } from "./components/entry-modal";
import EntryDetailDrawer from "./components/entry-detail-drawer";
import DeleteEntryDialog from "./components/delete-entry-dialog";

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-10 animate-pulse rounded-full bg-slate-100" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

const CalendarPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuthContext();
  const { sessions, selectedSessionId, loaded, entries } = useSelector((state: RootState) => state.calendar);
  const access = useCanManageCalendar();
  const entryAccess = useEntryWriteAccess();
  const canManage = access.status === "granted";
  const canAddEntry = entryAccess.status === "granted";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editYearOpen, setEditYearOpen] = useState(false);
  const [deleteYearOpen, setDeleteYearOpen] = useState(false);
  const [termModal, setTermModal] = useState<{ term?: CalendarTermDto } | null>(null);
  const [deleteTermTarget, setDeleteTermTarget] = useState<CalendarTermDto | null>(null);

  const [entryTypes, setEntryTypes] = useState<CalendarEntryTypeDto[]>([]);
  const entryTypeLabels: Record<string, string> = Object.fromEntries(entryTypes.map((t) => [t.key, t.label]));
  const [entryModal, setEntryModal] = useState<EntryModalMode | null>(null);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<CalendarEntryDto | null>(null);

  // Parents may filter the calendar by one child; everyone else sees it
  // unfiltered. This is the only role that needs its children's ids — the
  // /calendar route sits outside the /parent layout, so we load them here
  // rather than relying on ParentChildrenProvider.
  const isParent = user?.roleName === "Parent";
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    if (!isParent) return;
    parentService
      .getMyChildren()
      .then((res) => setChildren(res.data?.data ?? []))
      .catch(() => setChildren([]));
  }, [isParent]);

  useEffect(() => {
    calendarService
      .getEntryTypes()
      .then((res) => setEntryTypes(res.data?.data ?? []))
      .catch(() => setEntryTypes([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    calendarService
      .getSessions()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? [];
        dispatch(setSessions(data));
        const fallback = pickDefaultSession(data);
        dispatch(selectSession(fallback?.id ?? null));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const session: CalendarSessionDto | undefined = sessions.find((s) => s.id === selectedSessionId);
  const sortedTerms = session ? [...session.terms].sort((a, b) => a.sequence - b.sequence) : [];

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    calendarService
      .getEntries({ from: session.startDate, to: session.endDate, studentId: isParent ? selectedChildId ?? undefined : undefined })
      .then((res) => {
        if (!cancelled) dispatch(setEntries(res.data?.data ?? []));
      })
      .catch(() => {
        if (!cancelled) dispatch(setEntries([]));
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, session?.id, session?.startDate, session?.endDate, isParent, selectedChildId]);

  const handleSessionSaved = (updated: CalendarSessionDto) => {
    dispatch(upsertSession(updated));
  };

  const handleSessionDeleted = (sessionId: string) => {
    dispatch(removeSession(sessionId));
  };

  const handleEntrySaved = (entry: CalendarEntryDto) => {
    dispatch(upsertEntry(entry));
  };

  const handleEntryDeleted = (entryId: string) => {
    dispatch(removeEntry(entryId));
  };

  if (loading && !loaded) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <CalendarSkeleton />
      </div>
    );
  }

  if (loadError && sessions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Couldn't load the school calendar</p>
            <p className="mt-0.5 text-xs text-rose-600">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <CalendarEmptyState access={access} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6">
      {/* ── Session header ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900" title={session.name}>
                {session.name}
              </h1>
              <StatusChip status={session.status} />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              {formatDisplayRange(session.startDate, session.endDate)}
            </p>
          </div>

          {canManage && (
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditYearOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit year
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setDeleteYearOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {sessions.length > 1 && (
          <div className="mt-3">
            <SessionSwitcher
              sessions={sessions}
              selectedId={session.id}
              onSelect={(id) => dispatch(selectSession(id))}
            />
          </div>
        )}

        {isParent && children.length > 1 && (
          <div className="mt-3">
            <ChildSwitcher children={children} selectedId={selectedChildId} onSelect={setSelectedChildId} />
          </div>
        )}
      </div>

      {/* ── Timeline (decorative — term cards below carry the same info) ──── */}
      <YearTimeline session={session} entries={entries} />

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Terms</span>
          {canManage && (
            <Button
              type="button"
              size="sm"
              disabled={sortedTerms.length >= MAX_TERMS}
              title={sortedTerms.length >= MAX_TERMS ? `A session can have at most ${MAX_TERMS} terms` : undefined}
              onClick={() => setTermModal({})}
              className="bg-[#4F61E8] hover:bg-[#4F61E8]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add term
            </Button>
          )}
        </div>

        <ol className="space-y-3">
          {sortedTerms.map((term) => (
            <TermCard
              key={term.id}
              term={term}
              canManage={canManage}
              onlyTermLeft={sortedTerms.length === 1}
              onEdit={() => setTermModal({ term })}
              onDelete={() => setDeleteTermTarget(term)}
              onDeleteYearInstead={() => setDeleteYearOpen(true)}
              entries={entries.filter((e) => e.termId === term.id)}
              entryTypeLabels={entryTypeLabels}
              canAddEntry={canAddEntry}
              onAddEntry={() => setEntryModal({ kind: "create", term })}
              onOpenEntryDetail={(entry) => setDetailEntryId(entry.id)}
              onEditEntry={(entry) => setEntryModal({ kind: "edit", entry })}
              onDeleteEntry={(entry) => setDeleteEntryTarget(entry)}
            />
          ))}
        </ol>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {canManage && (
        <>
          <EditYearModal open={editYearOpen} onOpenChange={setEditYearOpen} session={session} onSaved={handleSessionSaved} />
          <DeleteYearDialog open={deleteYearOpen} onOpenChange={setDeleteYearOpen} session={session} onDeleted={handleSessionDeleted} />
          {termModal && (
            <TermModal
              open={!!termModal}
              onOpenChange={(open) => !open && setTermModal(null)}
              session={session}
              term={termModal.term}
              onSaved={handleSessionSaved}
            />
          )}
          {deleteTermTarget && (
            <DeleteTermDialog
              open={!!deleteTermTarget}
              onOpenChange={(open) => !open && setDeleteTermTarget(null)}
              term={deleteTermTarget}
              onDeleted={handleSessionSaved}
            />
          )}
        </>
      )}

      {entryModal && entryAccess.status === "granted" && (
        <EntryModal
          open={!!entryModal}
          onOpenChange={(open) => !open && setEntryModal(null)}
          session={session}
          access={entryAccess}
          entryTypes={entryTypes}
          mode={entryModal}
          onSaved={handleEntrySaved}
        />
      )}

      <EntryDetailDrawer
        open={!!detailEntryId}
        onOpenChange={(open) => !open && setDetailEntryId(null)}
        entryId={detailEntryId}
        entryTypeLabels={entryTypeLabels}
      />

      {deleteEntryTarget && (
        <DeleteEntryDialog
          open={!!deleteEntryTarget}
          onOpenChange={(open) => !open && setDeleteEntryTarget(null)}
          entry={deleteEntryTarget}
          onDeleted={handleEntryDeleted}
        />
      )}
    </div>
  );
};

export default CalendarPage;
