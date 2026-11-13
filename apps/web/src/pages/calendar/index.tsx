import { useEffect, useState } from "react";
import { AlertCircle, CalendarRange } from "lucide-react";
import { AxiosError } from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Skeleton } from "@bluethub/ui-kit";
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
import { formatDisplayRange, pickDefaultSession } from "./utils";
import StatusChip from "./components/status-chip";
import SessionSwitcher from "./components/session-switcher";
import YearTimeline from "./components/year-timeline";
import TermCard from "./components/term-card";
import CalendarEmptyState from "./components/empty-state";
import CalendarAdminPanel from "./components/admin-panel";
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
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-10 rounded-full" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
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
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Couldn't load the school calendar</p>
            <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400/80">{loadError}</p>
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
    <div className={`mx-auto w-full px-4 py-5 sm:px-6 ${canManage ? "max-w-5xl" : "max-w-3xl"}`}>
      <div className={canManage ? "lg:grid lg:grid-cols-[1fr_260px] lg:items-start lg:gap-5" : undefined}>
        <div className="space-y-5">
          {/* ── Session header ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-foreground" title={session.name}>
                  {session.name}
                </h1>
                <StatusChip status={session.status} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                {formatDisplayRange(session.startDate, session.endDate)}
              </p>
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

          {/* ── Timeline (decorative — term cards below carry the same info) ── */}
          <div className="mt-2">
            <YearTimeline session={session} entries={entries} />
          </div>

          {/* ── Terms ────────────────────────────────────────────────────── */}
          <div>
            <div className="mb-3">
              <span className="text-sm font-semibold text-foreground">Terms</span>
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
        </div>

        {canManage && (
          <CalendarAdminPanel
            termCount={sortedTerms.length}
            onEditYear={() => setEditYearOpen(true)}
            onAddTerm={() => setTermModal({})}
            onDeleteYear={() => setDeleteYearOpen(true)}
          />
        )}
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
