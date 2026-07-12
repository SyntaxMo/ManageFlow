export function formatWorkedDuration(decimalHours: number | null): string {
  if (decimalHours === null || !Number.isFinite(decimalHours)) {
    return "—";
  }

  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function calculateWorkedMinutesFromTimestamps(
  checkedInAt: string,
  checkedOutAt: string
) {
  return Math.max(
    0,
    Math.round(
      (new Date(checkedOutAt).getTime() - new Date(checkedInAt).getTime()) /
        60000
    )
  );
}

export function decimalHoursFromMinutes(totalMinutes: number) {
  return totalMinutes / 60;
}

export function minutesFromDecimalHours(decimalHours: number | null) {
  if (decimalHours === null || !Number.isFinite(decimalHours)) {
    return null;
  }

  return Math.round(decimalHours * 60);
}

export function splitDecimalHoursToParts(decimalHours: number | null) {
  const totalMinutes = minutesFromDecimalHours(decimalHours);
  if (totalMinutes == null) {
    return { hours: 0, minutes: 0 };
  }

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function decimalHoursFromParts(hours: number, minutes: number) {
  return hours + minutes / 60;
}

export function formatWorkedDurationProgress(
  workedHours: number | null,
  requiredHours: number | null
) {
  if (requiredHours == null) {
    return "—";
  }

  const workedLabel = formatWorkedDuration(workedHours ?? 0);
  const requiredLabel = formatWorkedDuration(requiredHours);
  return `${workedLabel} / ${requiredLabel}`;
}

export function formatRemainingDuration(remainingMinutes: number) {
  if (remainingMinutes <= 0) {
    return "0h 00m remaining";
  }

  return `${formatWorkedDuration(decimalHoursFromMinutes(remainingMinutes))} remaining`;
}

export function hasMetRequiredMinutes(
  workedMinutes: number | null,
  requiredMinutes: number
) {
  return workedMinutes != null && workedMinutes >= requiredMinutes;
}
