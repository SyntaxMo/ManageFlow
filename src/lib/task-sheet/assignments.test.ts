import { describe, expect, it } from "vitest";
import { formatInternOptionLabel } from "@/lib/task-sheet/assignments";

describe("formatInternOptionLabel", () => {
  it("formats intern name and job title", () => {
    expect(
      formatInternOptionLabel({
        full_name: "Alex Johnson",
        job_title: "UI Intern",
        role: "intern",
      })
    ).toBe("Alex Johnson · UI Intern");
  });

  it("falls back to role when job title is missing", () => {
    expect(
      formatInternOptionLabel({
        full_name: "Alex Johnson",
        job_title: null,
        role: "intern",
      })
    ).toBe("Alex Johnson · intern");
  });
});
