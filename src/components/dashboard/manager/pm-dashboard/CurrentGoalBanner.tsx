"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Target, X } from "lucide-react";
import type { PmCurrentGoal } from "@/lib/data/pm-dashboard";
import { updateTeamWeekGoal } from "@/lib/goals/actions";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface CurrentGoalBannerProps {
  currentGoal: PmCurrentGoal | null;
  /** PM can edit the goal for their team */
  editable?: boolean;
}

export function CurrentGoalBanner({
  currentGoal,
  editable = false,
}: CurrentGoalBannerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentGoal?.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDraft(currentGoal?.title ?? "");
    }
  }, [currentGoal?.title, editing]);

  function startEdit() {
    if (!currentGoal || !editable) return;
    setDraft(currentGoal.title);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setDraft(currentGoal?.title ?? "");
  }

  function saveEdit() {
    if (!currentGoal) return;
    startTransition(async () => {
      const result = await updateTeamWeekGoal({
        weekNumber: currentGoal.weekNumber,
        goalText: draft,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setError(null);
      router.refresh();
    });
  }

  return (
    <section className="mb-5 rounded-[12px] bg-deep px-5 py-5 text-white sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            {currentGoal ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Week {currentGoal.weekNumber} — Current goal
                  </p>
                  {editable && !editing && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Edit week goal"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={2}
                      maxLength={280}
                      disabled={isPending}
                      className="w-full rounded-[10px] border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="What should the team focus on this week?"
                    />
                    {error && (
                      <p className="text-xs text-red-200" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveEdit}
                        disabled={isPending}
                        className="bg-white text-deep hover:bg-white/90"
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isPending}
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg font-semibold sm:text-xl">
                    {currentGoal.title}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                  Current goal
                </p>
                <p className="text-lg font-semibold sm:text-xl">No active goal</p>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold leading-none sm:text-4xl">
            {currentGoal?.daysLeft ?? 0}
          </p>
          <p className="mt-1 text-xs text-white/75">days left</p>
        </div>
      </div>
    </section>
  );
}
