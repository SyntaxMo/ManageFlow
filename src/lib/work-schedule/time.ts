export type TwelveHourPeriod = "AM" | "PM";

export type TwelveHourTime = {
  hour: number;
  minute: number;
  period: TwelveHourPeriod;
};

export function normalizeDbTime(value: string) {
  return value.trim().slice(0, 5);
}

export function dbTimeToMinutes(value: string) {
  const normalized = normalizeDbTime(value);
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToDbTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function dbTimeToTwelveHour(dbTime: string): TwelveHourTime {
  const normalized = normalizeDbTime(dbTime);
  const [hour24, minute] = normalized.split(":").map(Number);
  const period: TwelveHourPeriod = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;

  return { hour, minute, period };
}

export function twelveHourToDbTime(time: TwelveHourTime) {
  let hour24 = time.hour % 12;
  if (time.period === "PM") {
    hour24 += 12;
  }
  if (time.period === "AM" && time.hour === 12) {
    hour24 = 0;
  }

  return `${String(hour24).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

export function formatDbTimeTo12Hour(dbTime: string) {
  const { hour, minute, period } = dbTimeToTwelveHour(dbTime);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatDbTimeRangeTo12Hour(startTime: string, endTime: string) {
  return `${formatDbTimeTo12Hour(startTime)} – ${formatDbTimeTo12Hour(endTime)}`;
}

export function calculateDurationHoursFromDbTimes(startTime: string, endTime: string) {
  const startMinutes = dbTimeToMinutes(startTime);
  const endMinutes = dbTimeToMinutes(endTime);
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

export function isValidTwelveHourTime(time: TwelveHourTime) {
  return (
    Number.isInteger(time.hour) &&
    time.hour >= 1 &&
    time.hour <= 12 &&
    Number.isInteger(time.minute) &&
    time.minute >= 0 &&
    time.minute <= 59 &&
    (time.period === "AM" || time.period === "PM")
  );
}

export const TWELVE_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);
