import type { UserRole } from "@/lib/auth/permissions";

export type DevTempRole = "intern" | "project_manager";

export const DEV_TEMP_PASSWORD = "DevTemp123!";

export const DEV_TEMP_ACCOUNTS: Record<
  DevTempRole,
  {
    email: string;
    fullName: string;
    role: UserRole;
    jobTitle: string;
  }
> = {
  intern: {
    email: "dev-intern@manageflow.test",
    fullName: "Dev Intern",
    role: "intern",
    jobTitle: "Intern",
  },
  project_manager: {
    email: "dev-pm@manageflow.test",
    fullName: "Dev Project Manager",
    role: "project_manager",
    jobTitle: "Project Manager",
  },
};
