import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEV_FAST_AUTH } from "@/config/development";
import type { UserRole } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin)
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin)
    );
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const metadata = user.user_metadata ?? {};
    const role = (metadata.role as UserRole | undefined) ?? "intern";
    const jobTitle =
      typeof metadata.job_title === "string" ? metadata.job_title : null;
    const fullName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : user.email?.split("@")[0] ?? "User";
    const teamId =
      typeof metadata.team_id === "string" ? metadata.team_id : null;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? "",
      role,
      job_title: jobTitle,
      team_id: teamId,
      status: DEV_FAST_AUTH ? "active" : "pending",
    });

    if (profileError) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", requestUrl.origin)
      );
    }

    if (role === "intern") {
      const isUniversityRequirement = Boolean(metadata.is_university_requirement);
      await supabase.from("intern_training_details").insert({
        user_id: user.id,
        is_university_requirement: isUniversityRequirement,
        university_id:
          isUniversityRequirement && typeof metadata.university_id === "string"
            ? metadata.university_id
            : null,
        university_name_other:
          isUniversityRequirement &&
          typeof metadata.university_name_other === "string"
            ? metadata.university_name_other
            : null,
      });
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "user_registered",
      entity_type: "profile",
      entity_id: user.id,
      details: {
        role,
        job_title: jobTitle,
        source: "auth_callback",
      },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
