"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PmAttendanceMemberRow, PmAttendancePageData } from "@/lib/data/pm-attendance";
import { markInternAbsent } from "@/lib/attendance/actions";
import { AttendanceSummaryCards } from "@/components/dashboard/manager/pm-attendance/AttendanceSummaryCards";
import { AttendanceTable } from "@/components/dashboard/manager/pm-attendance/AttendanceTable";
import { EditAttendanceModal } from "@/components/dashboard/manager/pm-attendance/EditAttendanceModal";

interface PmAttendanceViewProps {
  data: PmAttendancePageData;
}

export function PmAttendanceView({ data }: PmAttendanceViewProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<PmAttendanceMemberRow | null>(null);
  const [markingAbsentId, setMarkingAbsentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast && !errorToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setErrorToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, errorToast]);

  const pageMessage = useMemo(() => {
    if (data.loadState === "interns_error") {
      return data.errors[0] ?? "We could not load your assigned interns.";
    }
    if (data.loadState === "no_interns") {
      return "No active interns are assigned to you.";
    }
    return null;
  }, [data.loadState, data.errors]);

  function handleDateChange(nextDate: string) {
    router.push(`/dashboard/attendance?date=${nextDate}`);
    router.refresh();
  }

  function handleMarkAbsent(row: PmAttendanceMemberRow) {
    if (markingAbsentId || isPending) return;

    const confirmed = window.confirm(
      `Mark ${row.member.full_name} absent for ${data.selectedDate}?`
    );
    if (!confirmed) return;

    setMarkingAbsentId(row.member.id);
    startTransition(async () => {
      const result = await markInternAbsent({
        intern_id: row.member.id,
        check_in_date: data.selectedDate,
      });
      setMarkingAbsentId(null);

      if (!result.success) {
        setErrorToast(result.error);
        return;
      }

      setToast("Attendance marked as absent.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Attendance</h1>
          <p className="mt-1 text-sm text-muted">
            Monitor and manage team attendance
          </p>
        </div>
        <input
          type="date"
          value={data.selectedDate}
          onChange={(event) => handleDateChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink sm:w-auto"
          aria-label="Attendance date"
        />
      </div>

      {pageMessage && (
        <div className="mb-5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pageMessage}
        </div>
      )}

      {data.checkInsLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("attendance")) ??
            "We could not load attendance records."}
        </div>
      )}

      {data.reportsLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("report")) ??
            "We could not load daily reports."}
        </div>
      )}

      {data.schedulesLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("schedule")) ??
            "We could not load approved work schedules."}
        </div>
      )}

      {data.stats ? (
        <AttendanceSummaryCards stats={data.stats} />
      ) : (
        <div className="mb-5 rounded-[12px] border border-border bg-white px-4 py-3 text-sm text-muted">
          Summary counts are unavailable because attendance or report data could not be loaded.
        </div>
      )}

      <AttendanceTable
        rows={data.rows}
        reportsLoadState={data.reportsLoadState}
        onEdit={setEditingRow}
        onMarkAbsent={handleMarkAbsent}
        markingAbsentId={markingAbsentId}
      />

      <EditAttendanceModal
        open={Boolean(editingRow)}
        row={editingRow}
        selectedDate={data.selectedDate}
        onClose={() => setEditingRow(null)}
        onSuccess={(message) => {
          setToast(message);
          router.refresh();
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-deep px-4 py-3 text-sm text-white shadow-panel">
          {toast}
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-panel">
          {errorToast}
        </div>
      )}
    </div>
  );
}
