"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  InternScheduleForm,
  MIN_WEEKLY_HOURS,
  type ScheduleBlock,
} from "@/components/forms/InternScheduleForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { DEV_FAST_AUTH } from "@/config/development";
import type { Team, University } from "@/lib/db/types";
import type { UserRole } from "@/lib/auth/permissions";

const TEAM_REQUIRED_ROLES = ["team_lead", "project_manager", "intern"] as const;

const roleOptions = [
  {
    label: "Director",
    value: "senior_manager",
    jobTitle: "Director",
  },
  {
    label: "Producer",
    value: "senior_manager",
    jobTitle: "Producer",
  },
  {
    label: "Team Lead",
    value: "team_lead",
    jobTitle: "Team Lead",
  },
  {
    label: "Project Manager",
    value: "project_manager",
    jobTitle: "Project Manager",
  },
  {
    label: "Intern",
    value: "intern",
    jobTitle: "Intern",
  },
] as const;

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      label: "Weak",
      colorClass: "text-red-600",
      barClass: "bg-red-500",
      score,
    };
  }

  if (score <= 4) {
    return {
      label: "Moderate",
      colorClass: "text-orange-600",
      barClass: "bg-orange-500",
      score,
    };
  }

  return {
    label: "Strong",
    colorClass: "text-green-600",
    barClass: "bg-green-500",
    score,
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleLabel, setSelectedRoleLabel] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);
  const [universitiesError, setUniversitiesError] = useState<string | null>(null);
  const [isUniversityRequirement, setIsUniversityRequirement] = useState(false);
  const [universityId, setUniversityId] = useState("");
  const [universityNameOther, setUniversityNameOther] = useState("");
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isScheduleValid, setIsScheduleValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedRole = useMemo(
    () => roleOptions.find((option) => option.label === selectedRoleLabel),
    [selectedRoleLabel]
  );

  const isIntern = selectedRole?.value === "intern";
  const requiresTeam =
    selectedRole != null &&
    TEAM_REQUIRED_ROLES.includes(
      selectedRole.value as (typeof TEAM_REQUIRED_ROLES)[number]
    );

  const selectedUniversity = useMemo(
    () => universities.find((university) => university.id === universityId),
    [universities, universityId]
  );

  const isOtherUniversitySelected = selectedUniversity?.name === "Other";

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted && user) {
        router.replace("/dashboard");
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      setTeamsLoading(true);
      setTeamsError(null);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("teams")
          .select("id, name, description")
          .order("name", { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error("Failed to load teams:", error);
          setTeams([]);
          setTeamsError("Failed to load teams.");
          return;
        }

        setTeams((data ?? []) as Team[]);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load teams:", err);
        setTeams([]);
        setTeamsError("Failed to load teams.");
      } finally {
        if (isMounted) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isIntern) {
      setUniversitiesLoading(false);
      setUniversitiesError(null);
      return;
    }

    let isMounted = true;

    async function loadUniversities() {
      setUniversitiesLoading(true);
      setUniversitiesError(null);

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("universities")
          .select("id, name")
          .order("name", { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error("Failed to load universities:", error);
          setUniversities([]);
          setUniversitiesError("Failed to load universities.");
          return;
        }

        setUniversities((data ?? []) as University[]);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load universities:", err);
        setUniversities([]);
        setUniversitiesError("Failed to load universities.");
      } finally {
        if (isMounted) {
          setUniversitiesLoading(false);
        }
      }
    }

    loadUniversities();

    return () => {
      isMounted = false;
    };
  }, [isIntern]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const handleScheduleChange = useCallback(
    (blocks: ScheduleBlock[], total: number, valid: boolean) => {
      setScheduleBlocks(blocks);
      setTotalHours(total);
      setIsScheduleValid(valid);
    },
    []
  );

  async function completeRegistration(
    userId: string,
    role: UserRole,
    jobTitle: string,
    selectedTeamId: string | null
  ) {
    const supabase = createClient();
    const profileStatus = DEV_FAST_AUTH ? "active" : "pending";

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        role,
        job_title: jobTitle,
        team_id: selectedTeamId,
        status: profileStatus,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    let scheduleTotalHours: number | null = null;

    if (role === "intern") {
      const trainingPayload = isUniversityRequirement
        ? {
            user_id: userId,
            is_university_requirement: true,
            university_id: universityId || null,
            university_name_other: isOtherUniversitySelected
              ? universityNameOther.trim() || null
              : null,
          }
        : {
            user_id: userId,
            is_university_requirement: false,
            university_id: null,
            university_name_other: null,
          };

      const { data: existingTraining } = await supabase
        .from("intern_training_details")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingTraining) {
        const { error: trainingError } = await supabase
          .from("intern_training_details")
          .insert(trainingPayload);

        if (trainingError) {
          console.error(
            "Failed to save university training details:",
            trainingError
          );
          throw new Error(
            `Failed to save university training details: ${trainingError.message}`
          );
        }
      }

      const { data: existingSchedule } = await supabase
        .from("work_schedules")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let scheduleId: string;

      if (existingSchedule) {
        const { error: scheduleUpdateError } = await supabase
          .from("work_schedules")
          .update({
            total_weekly_hours: totalHours,
            status: "pending",
          })
          .eq("id", existingSchedule.id);

        if (scheduleUpdateError) {
          console.error("Failed to save weekly schedule:", scheduleUpdateError);
          throw new Error(
            `Failed to save weekly schedule: ${scheduleUpdateError.message}`
          );
        }

        scheduleId = existingSchedule.id;
      } else {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("work_schedules")
          .insert({
            user_id: userId,
            total_weekly_hours: totalHours,
            status: "pending",
          })
          .select("id")
          .single();

        if (scheduleError || !scheduleData) {
          console.error("Failed to save weekly schedule:", scheduleError);
          throw new Error(
            `Failed to save weekly schedule: ${scheduleError?.message ?? "Unknown error"}`
          );
        }

        scheduleId = scheduleData.id;
      }

      scheduleTotalHours = totalHours;

      const { count: existingBlockCount } = await supabase
        .from("work_schedule_blocks")
        .select("*", { count: "exact", head: true })
        .eq("schedule_id", scheduleId);

      if (!existingBlockCount || existingBlockCount === 0) {
        const blocksToInsert = scheduleBlocks.map((block) => ({
          schedule_id: scheduleId,
          day_of_week: block.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
          calculated_hours: block.calculated_hours,
        }));

        const { error: blocksError } = await supabase
          .from("work_schedule_blocks")
          .insert(blocksToInsert);

        if (blocksError) {
          console.error("Failed to save schedule days:", blocksError);
          throw new Error(
            `Failed to save schedule days: ${blocksError.message}`
          );
        }
      }
    }

    const { error: logError } = await supabase.from("activity_logs").insert({
      user_id: userId,
      action: "user_registered",
      entity_type: "profile",
      entity_id: userId,
      details: {
        role,
        job_title: jobTitle,
        ...(scheduleTotalHours !== null
          ? { total_weekly_hours: scheduleTotalHours }
          : {}),
      },
    });

    if (logError) {
      console.error("Failed to log activity:", logError.message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedRole) {
      setError("Please select your role.");
      return;
    }

    if (requiresTeam && !teamId) {
      setError("Please select your team.");
      return;
    }

    if (isIntern && isUniversityRequirement && !universityId) {
      setError("Please select a university.");
      return;
    }

    if (
      isIntern &&
      isUniversityRequirement &&
      isOtherUniversitySelected &&
      !universityNameOther.trim()
    ) {
      setError("Please enter your university name.");
      return;
    }

    if (isIntern && (!isScheduleValid || totalHours < MIN_WEEKLY_HOURS)) {
      setError(
        `Your weekly schedule must be at least ${MIN_WEEKLY_HOURS} hours.`
      );
      return;
    }

    setIsLoading(true);

    let authUserCreated = false;

    try {
      const supabase = createClient();

      let authData: Awaited<
        ReturnType<typeof supabase.auth.signUp>
      >["data"] | null = null;
      let signUpError: Awaited<
        ReturnType<typeof supabase.auth.signUp>
      >["error"] | null = null;

      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role: selectedRole.value,
            job_title: selectedRole.jobTitle,
            team_id: teamId || null,
            is_university_requirement: isIntern
              ? isUniversityRequirement
              : false,
            university_id:
              isIntern && isUniversityRequirement ? universityId : null,
            university_name_other:
              isIntern && isUniversityRequirement && isOtherUniversitySelected
                ? universityNameOther.trim()
                : null,
          },
        },
      });

      authData = signUpResult.data;
      signUpError = signUpResult.error;

      if (signUpError) {
        const isExistingUser =
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already been registered");

        if (isExistingUser) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError || !signInData.user) {
            console.error("Failed to create authentication account:", signUpError);
            setError(
              `Failed to create authentication account: ${signUpError.message}`
            );
            return;
          }

          authData = { user: signInData.user, session: signInData.session };
          signUpError = null;
        } else {
          console.error("Failed to create authentication account:", signUpError);
          setError(
            `Failed to create authentication account: ${signUpError.message}`
          );
          return;
        }
      }

      if (!authData?.user) {
        setError("Failed to create authentication account. Please try again.");
        return;
      }

      authUserCreated = true;

      let hasSession = Boolean(authData.session);

      if (!hasSession) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError) {
          hasSession = true;
        } else if (!DEV_FAST_AUTH) {
          setSuccess(
            "Account created. Please check your email to confirm your account. After confirming, you will be redirected to your dashboard."
          );
          return;
        } else {
          console.error("Authentication session was not created:", signInError);
          setError(
            "The account was created, but Supabase email confirmation is still enabled. Disable Confirm email in the Supabase Email provider settings to use instant development registration."
          );
          return;
        }
      }

      if (!hasSession) {
        setError("Authentication session was not created. Please try again.");
        return;
      }

      await completeRegistration(
        authData.user.id,
        selectedRole.value as UserRole,
        selectedRole.jobTitle,
        teamId || null
      );

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Registration error:", err);
      if (authUserCreated) {
        setError(
          err instanceof Error
            ? `Your authentication account was created, but profile setup failed. ${err.message} Please retry registration or check the console error.`
            : "Your authentication account was created, but profile setup failed. Please retry registration or check the console error."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit =
    Boolean(selectedRole) &&
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    (!requiresTeam || (Boolean(teamId) && !teamsError && !teamsLoading)) &&
    (!isIntern ||
      (isScheduleValid &&
        totalHours >= MIN_WEEKLY_HOURS &&
        (!isUniversityRequirement ||
          (!universitiesError &&
            !universitiesLoading &&
            Boolean(universityId) &&
            (!isOtherUniversitySelected ||
              universityNameOther.trim().length > 0)))));

  const strengthBarWidth = password
    ? `${Math.max((passwordStrength.score / 5) * 100, 8)}%`
    : "0%";

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            ManageFlow
          </Link>
          <p className="mt-2 text-sm text-muted">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Set up your account. Interns must also submit a weekly schedule
              of at least 32 hours.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="role"
                className="block text-sm font-medium text-ink"
              >
                Role
              </label>
              <select
                id="role"
                value={selectedRoleLabel}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  setSelectedRoleLabel(nextRole);
                  const nextOption = roleOptions.find(
                    (option) => option.label === nextRole
                  );
                  if (
                    !nextOption ||
                    !TEAM_REQUIRED_ROLES.includes(
                      nextOption.value as (typeof TEAM_REQUIRED_ROLES)[number]
                    )
                  ) {
                    setTeamId("");
                  }
                  if (nextOption?.value !== "intern") {
                    setIsUniversityRequirement(false);
                    setUniversityId("");
                    setUniversityNameOther("");
                    setUniversities([]);
                    setUniversitiesError(null);
                    setUniversitiesLoading(false);
                  }
                }}
                required
                disabled={isLoading}
                className="flex h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" disabled>
                  Select your role
                </option>
                {roleOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {requiresTeam && (
              <div className="space-y-2">
                <label htmlFor="team" className="block text-sm font-medium text-ink">
                  Team
                </label>
                <select
                  id="team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  required
                  disabled={isLoading || teamsLoading || Boolean(teamsError)}
                  className="flex h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {teamsLoading ? (
                    <option value="">Loading teams...</option>
                  ) : teamsError ? (
                    <option value="">Failed to load teams</option>
                  ) : teams.length === 0 ? (
                    <option value="">No teams found</option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Select your team
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {teamsError && (
                  <p className="text-sm text-red-600">{teamsError}</p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="name"
                required
                autoComplete="name"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gmail.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="w-full">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={isLoading}
              />

              {password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Password strength</span>
                    <span
                      className={cn("font-medium", passwordStrength.colorClass)}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        passwordStrength.barClass
                      )}
                      style={{ width: strengthBarWidth }}
                    />
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-muted">
                Use at least 8 characters with uppercase, lowercase, number, and
                symbol.
              </p>
            </div>

            {isIntern && (
              <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={isUniversityRequirement}
                    onChange={(e) => {
                      setIsUniversityRequirement(e.target.checked);
                      if (!e.target.checked) {
                        setUniversityId("");
                        setUniversityNameOther("");
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  This internship is a university training requirement
                </label>

                {isUniversityRequirement && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="university"
                        className="block text-sm font-medium text-ink"
                      >
                        University
                      </label>
                      <select
                        id="university"
                        value={universityId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setUniversityId(nextId);
                          const nextUniversity = universities.find(
                            (university) => university.id === nextId
                          );
                          if (nextUniversity?.name !== "Other") {
                            setUniversityNameOther("");
                          }
                        }}
                        required
                        disabled={
                          isLoading || universitiesLoading || Boolean(universitiesError)
                        }
                        className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {universitiesLoading ? (
                          <option value="">Loading universities...</option>
                        ) : universitiesError ? (
                          <option value="">Failed to load universities</option>
                        ) : universities.length === 0 ? (
                          <option value="">No universities found</option>
                        ) : (
                          <>
                            <option value="" disabled>
                              Select university
                            </option>
                            {universities.map((university) => (
                              <option key={university.id} value={university.id}>
                                {university.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {universitiesError && (
                        <p className="text-sm text-red-600">{universitiesError}</p>
                      )}
                    </div>
                    {isOtherUniversitySelected && (
                      <Input
                        label="Type your university name"
                        value={universityNameOther}
                        onChange={(e) => setUniversityNameOther(e.target.value)}
                        required
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {isIntern && (
              <InternScheduleForm
                onChange={handleScheduleChange}
                disabled={isLoading}
              />
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!canSubmit}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
