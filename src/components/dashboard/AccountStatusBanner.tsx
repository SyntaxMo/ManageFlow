export function AccountStatusBanner({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Your account is pending approval. Some features are limited until an
        admin or manager activates your account.
      </div>
    );
  }

  if (status === "inactive") {
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Your account is inactive. Please contact an admin.
      </div>
    );
  }

  return null;
}
