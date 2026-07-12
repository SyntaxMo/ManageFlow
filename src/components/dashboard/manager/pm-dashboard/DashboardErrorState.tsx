"use client";

interface DashboardErrorStateProps {
  messages: string[];
}

export function DashboardErrorState({ messages }: DashboardErrorStateProps) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
    >
      <p className="font-medium">We could not load some dashboard data.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        Refresh page
      </button>
    </div>
  );
}
