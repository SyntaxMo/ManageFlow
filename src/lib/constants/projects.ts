export const PROJECT_JOIN_REQUEST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type ProjectJoinRequestStatusValue =
  (typeof PROJECT_JOIN_REQUEST_STATUS)[keyof typeof PROJECT_JOIN_REQUEST_STATUS];

export const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
] as const;
