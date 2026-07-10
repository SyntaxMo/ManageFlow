"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError || !data) {
          setError("Failed to load profile.");
          return;
        }

        setProfile(data);
        setFullName(data.full_name);
        setJobTitle(data.job_title ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load profile."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          job_title: jobTitle.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", profile.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Profile updated successfully.");
      setProfile({
        ...profile,
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">Unable to load profile.</p>
      </div>
    );
  }

  const role = profile.role as UserRole;

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Settings"
      subtitle="Manage your profile information"
    >
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your personal information. Role and status cannot be changed
              here.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Email"
                value={profile.email}
                disabled
              />
              <Input
                label="Job title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Game Design Intern"
              />
              <Input
                label="Avatar URL"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
                <p className="text-muted">
                  Role:{" "}
                  <span className="font-medium capitalize text-ink">
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </p>
                <p className="mt-1 text-muted">
                  Status:{" "}
                  <span className="font-medium capitalize text-ink">
                    {profile.status}
                  </span>
                </p>
              </div>

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

              <Button type="submit" isLoading={isSaving}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
