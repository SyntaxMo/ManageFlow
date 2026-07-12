"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Meeting } from "@/lib/db/types";
import type { PmSchedulePageData } from "@/lib/data/pm-schedule";
import { Button } from "@/components/ui/Button";
import { ScheduleGoalBanner } from "@/components/dashboard/manager/pm-schedule/ScheduleGoalBanner";
import { WeekScheduleCard } from "@/components/dashboard/manager/pm-schedule/WeekScheduleCard";
import { TodaysMeetingsPanel } from "@/components/dashboard/manager/pm-schedule/TodaysMeetingsPanel";
import { UpcomingMeetingsPanel } from "@/components/dashboard/manager/pm-schedule/UpcomingMeetingsPanel";
import { FullInternshipTimeline } from "@/components/dashboard/manager/pm-schedule/FullInternshipTimeline";
import { AddMeetingModal } from "@/components/dashboard/manager/pm-schedule/AddMeetingModal";
import { MeetingDetailModal } from "@/components/dashboard/manager/pm-schedule/MeetingDetailModal";

interface ScheduleWorkspaceViewProps {
  data: PmSchedulePageData;
  subtitle: string;
  canManageMeetings?: boolean;
}

export function ScheduleWorkspaceView({
  data,
  subtitle,
  canManageMeetings = false,
}: ScheduleWorkspaceViewProps) {
  const router = useRouter();
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast && !errorToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setErrorToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, errorToast]);

  const meetingsById = useMemo(() => {
    const map = new Map<string, Meeting>();
    for (const meeting of [
      ...data.todayMeetings,
      ...data.upcomingMeetings,
      ...Object.values(data.weekScheduleItems)
        .flat()
        .map((item) => item.meeting)
        .filter(Boolean) as Meeting[],
    ]) {
      map.set(meeting.id, meeting);
    }
    return map;
  }, [data.todayMeetings, data.upcomingMeetings, data.weekScheduleItems]);

  const selectedMeeting = selectedMeetingId
    ? meetingsById.get(selectedMeetingId) ?? null
    : null;

  const pageError = useMemo(() => {
    if (data.loadState === "project_error") {
      return data.errors[0] ?? "We could not load your assigned project.";
    }
    if (data.loadState === "no_project") {
      return "No active project is assigned to you.";
    }
    if (data.loadState === "missing_dates") {
      return "Your active project is missing start or deadline dates.";
    }
    return null;
  }, [data.loadState, data.errors]);

  function handleMeetingSuccess(message: string) {
    setToast(message);
    router.refresh();
  }

  function openMeeting(meetingId: string) {
    setSelectedMeetingId(meetingId);
  }

  const canAddMeeting =
    canManageMeetings &&
    data.loadState === "loaded" &&
    data.project &&
    data.meetingsLoadState !== "error";

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Schedule &amp; Timeline</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {canManageMeetings && (
          <Button
            className="w-full sm:w-auto"
            onClick={() => setAddMeetingOpen(true)}
            disabled={!canAddMeeting}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Meeting
          </Button>
        )}
      </div>

      {pageError && (
        <div className="mb-5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pageError}
        </div>
      )}

      {data.timelineLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("timeline")) ??
            "We could not load the project timeline."}
        </div>
      )}

      <ScheduleGoalBanner
        weekNumber={data.currentWeekNumber}
        goal={data.currentGoal}
        currentWeek={data.currentWeek}
        daysLeft={data.daysLeft}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <WeekScheduleCard
          weekNumber={data.currentWeekNumber}
          currentWeek={data.currentWeek}
          weekDays={data.weekDays}
          scheduleItems={data.weekScheduleItems}
          onSelectMeeting={openMeeting}
        />

        <div className="space-y-5">
          <TodaysMeetingsPanel
            meetings={data.todayMeetings}
            onSelectMeeting={openMeeting}
          />
          <UpcomingMeetingsPanel
            meetings={data.upcomingMeetings}
            onSelectMeeting={openMeeting}
          />
        </div>
      </div>

      <div className="mt-5">
        <FullInternshipTimeline
          weeks={data.internshipTimeline}
          startDate={data.project?.start_date ?? null}
          deadline={data.project?.deadline ?? null}
        />
      </div>

      {canManageMeetings && (
        <AddMeetingModal
          open={addMeetingOpen}
          onClose={() => setAddMeetingOpen(false)}
          data={data}
          onSuccess={handleMeetingSuccess}
        />
      )}

      <MeetingDetailModal
        meeting={selectedMeeting}
        onClose={() => setSelectedMeetingId(null)}
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
