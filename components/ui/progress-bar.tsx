export function ProgressBar({ value }: { value: number }) {
  const width = Math.min(Math.max(value, 0), 100);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
      <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
    </div>
  );
}
