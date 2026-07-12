"use client";

import type { PmSchedulePageData } from "@/lib/data/pm-schedule";
import { ScheduleWorkspaceView } from "@/components/dashboard/shared/ScheduleWorkspaceView";

interface InternScheduleViewProps {
  data: PmSchedulePageData;
}

export function InternScheduleView({ data }: InternScheduleViewProps) {
  return (
    <ScheduleWorkspaceView
      data={data}
      subtitle="Your schedule and internship timeline"
    />
  );
}
