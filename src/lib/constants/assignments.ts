export const ASSIGNMENT_REQUEST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export type AssignmentRequestStatus =
  (typeof ASSIGNMENT_REQUEST_STATUS)[keyof typeof ASSIGNMENT_REQUEST_STATUS];
