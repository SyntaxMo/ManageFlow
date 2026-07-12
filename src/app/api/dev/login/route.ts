import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEV_FAST_AUTH } from "@/config/development";
import {
  DEV_TEMP_ACCOUNTS,
  DEV_TEMP_PASSWORD,
  type DevTempRole,
} from "@/lib/auth/dev-temp-accounts";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

type SupabaseRouteClient = ReturnType<typeof createServerClient>;

async function ensureAuthUser(
  supabase: SupabaseRouteClient,
  role: DevTempRole
): Promise<{ userId: string; error: string | null }> {
  const account = DEV_TEMP_ACCOUNTS[role];

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: account.email,
      password: DEV_TEMP_PASSWORD,
    });

  if (!signInError && signInData.user) {
    return { userId: signInData.user.id, error: null };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: DEV_TEMP_PASSWORD,
    options: {
      data: {
        full_name: account.fullName,
        role: account.role,
        job_title: account.jobTitle,
      },
    },
  });

  if (signUpError) {
    return {
      userId: "",
      error:
        signInError?.message ??
        signUpError.message ??
        "Failed to create temp account.",
    };
  }

  if (signUpData.session && signUpData.user) {
    return { userId: signUpData.user.id, error: null };
  }

  const { data: retryData, error: retryError } =
    await supabase.auth.signInWithPassword({
      email: account.email,
      password: DEV_TEMP_PASSWORD,
    });

  if (retryError || !retryData.user) {
    return {
      userId: "",
      error:
        "Temp account was created, but Supabase email confirmation is still enabled. Disable Confirm email in the Supabase Auth Email provider settings to use instant temp login.",
    };
  }

  return { userId: retryData.user.id, error: null };
}

async function upsertTempProfile(
  supabase: SupabaseRouteClient,
  userId: string,
  role: DevTempRole,
  teamId: string | null,
  managerId: string | null = null
) {
  const account = DEV_TEMP_ACCOUNTS[role];

  return supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: account.fullName,
      email: account.email,
      role: account.role,
      job_title: account.jobTitle,
      team_id: teamId,
      manager_id: managerId,
      status: "active",
    },
    { onConflict: "id" }
  );
}

export async function POST(request: Request) {
  if (!DEV_FAST_AUTH) {
    return NextResponse.json(
      { error: "Dev login is disabled." },
      { status: 403 }
    );
  }

  let role: DevTempRole;
  try {
    const body = (await request.json()) as { role?: string };
    if (body.role !== "intern" && body.role !== "project_manager") {
      return NextResponse.json(
        { error: "Unsupported temp role." },
        { status: 400 }
      );
    }
    role = body.role;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 }
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Teams are readable only when authenticated, so sign in before loading one.
  const pmAuth = await ensureAuthUser(supabase, "project_manager");
  if (pmAuth.error) {
    return NextResponse.json({ error: pmAuth.error }, { status: 400 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  const teamId = team?.id ?? null;

  const { error: pmProfileError } = await upsertTempProfile(
    supabase,
    pmAuth.userId,
    "project_manager",
    teamId,
    null
  );

  if (pmProfileError) {
    return NextResponse.json(
      {
        error: `Failed to set up project manager profile: ${pmProfileError.message}`,
      },
      { status: 500 }
    );
  }

  const internAuth = await ensureAuthUser(supabase, "intern");
  if (internAuth.error) {
    return NextResponse.json({ error: internAuth.error }, { status: 400 });
  }

  const { error: internProfileError } = await upsertTempProfile(
    supabase,
    internAuth.userId,
    "intern",
    teamId,
    pmAuth.userId
  );

  if (internProfileError) {
    return NextResponse.json(
      {
        error: `Failed to set up intern profile: ${internProfileError.message}`,
      },
      { status: 500 }
    );
  }

  // Best-effort cleanup of stale pending requests (may be blocked by RLS for interns).
  await supabase
    .from("manager_assignment_requests")
    .delete()
    .eq("intern_id", internAuth.userId)
    .eq("status", ASSIGNMENT_REQUEST_STATUS.PENDING);

  const { data: leftoverPending } = await supabase
    .from("manager_assignment_requests")
    .select("id")
    .eq("intern_id", internAuth.userId)
    .eq("status", ASSIGNMENT_REQUEST_STATUS.PENDING);

  // Finish signed in as the requested role so response cookies match.
  // If stale pending requests remain, clear them as the PM (intern RLS blocks this).
  if (
    role === "project_manager" ||
    (leftoverPending && leftoverPending.length > 0)
  ) {
    const finalPmAuth = await ensureAuthUser(supabase, "project_manager");
    if (finalPmAuth.error) {
      return NextResponse.json({ error: finalPmAuth.error }, { status: 400 });
    }

    for (const request of leftoverPending ?? []) {
      // Reject rather than accept: accept fails when manager_id is already set.
      await supabase.rpc("respond_to_manager_assignment_request", {
        p_request_id: request.id,
        p_decision: "rejected",
      });
    }

    if (role === "intern") {
      const finalInternAuth = await ensureAuthUser(supabase, "intern");
      if (finalInternAuth.error) {
        return NextResponse.json(
          { error: finalInternAuth.error },
          { status: 400 }
        );
      }
    }
  }

  return response;
}
