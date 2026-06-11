"use client";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-lg font-bold text-danger">Failed to load menu</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-pill bg-primary px-6 py-2 text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
