"use client";

import type { PmSchedulePageData } from "@/lib/data/pm-schedule";
import { ScheduleWorkspaceView } from "@/components/dashboard/shared/ScheduleWorkspaceView";

interface PmScheduleViewProps {
  data: PmSchedulePageData;
}

export function PmScheduleView({ data }: PmScheduleViewProps) {
  return (
    <ScheduleWorkspaceView
      data={data}
      subtitle="Manage team schedule and meetings"
      canManageMeetings
    />
  );
}
