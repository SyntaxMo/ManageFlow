import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getUserProfile();

  if (!data) {
    redirect("/login");
  }

  if (!data.profile) {
    // Do not sign out here — that fights the browser session and can white-screen.
    // Middleware allows /login when a session exists without a profile.
    redirect("/login?error=missing_profile");
  }

  return <>{children}</>;
}
