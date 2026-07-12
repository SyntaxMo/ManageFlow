"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEV_FAST_AUTH } from "@/config/development";
import type { DevTempRole } from "@/lib/auth/dev-temp-accounts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

function goToDashboard() {
  window.location.assign("/dashboard");
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devLoadingRole, setDevLoadingRole] = useState<DevTempRole | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const params = new URLSearchParams(window.location.search);
      const missingProfile = params.get("error") === "missing_profile";

      if (missingProfile) {
        setError(
          "Your account signed in, but no profile was found. Try a temp login again or register a new account."
        );
        await createClient().auth.signOut();
        window.history.replaceState({}, "", "/login");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted && profile) {
        goToDashboard();
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      goToDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    }
  }

  async function handleDevLogin(role: DevTempRole) {
    setError(null);
    setDevLoadingRole(role);

    try {
      const response = await fetch("/api/dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to sign in as temp account.");
        return;
      }

      goToDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in as temp account."
      );
    } finally {
      setDevLoadingRole(null);
    }
  }

  const isBusy = isLoading || devLoadingRole !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            ManageFlow
          </Link>
          <p className="mt-2 text-sm text-muted">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          {DEV_FAST_AUTH && (
            <div className="mt-6 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Development login
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Jump in as a reusable temp account. Created automatically on
                  first use.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={isBusy}
                  isLoading={devLoadingRole === "intern"}
                  onClick={() => handleDevLogin("intern")}
                >
                  Temp Intern
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={isBusy}
                  isLoading={devLoadingRole === "project_manager"}
                  onClick={() => handleDevLogin("project_manager")}
                >
                  Temp PM
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
