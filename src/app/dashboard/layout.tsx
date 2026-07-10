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

  const { profile } = data;

  if (!profile) {
    redirect("/login");
  }

  return <>{children}</>;
}
