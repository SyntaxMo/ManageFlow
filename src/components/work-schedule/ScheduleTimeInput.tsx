"use client";

import {
  MINUTE_OPTIONS,
  TWELVE_HOUR_OPTIONS,
  type TwelveHourPeriod,
  type TwelveHourTime,
} from "@/lib/work-schedule/time";

interface ScheduleTimeSelectsProps {
  label: string;
  value: TwelveHourTime;
  onChange: (value: TwelveHourTime) => void;
  disabled?: boolean;
}

const selectClassName =
  "h-10 rounded-lg border border-border bg-white px-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function ScheduleTimeSelects({
  label,
  value,
  onChange,
  disabled = false,
}: ScheduleTimeSelectsProps) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <select
        aria-label={`${label} hour`}
        className={`${selectClassName} w-[58px]`}
        value={value.hour}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...value, hour: Number(event.target.value) })
        }
      >
        {TWELVE_HOUR_OPTIONS.map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-muted">:</span>
      <select
        aria-label={`${label} minute`}
        className={`${selectClassName} w-[58px]`}
        value={value.minute}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...value, minute: Number(event.target.value) })
        }
      >
        {MINUTE_OPTIONS.map((minute) => (
          <option key={minute} value={minute}>
            {String(minute).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} period`}
        className={`${selectClassName} w-[72px]`}
        value={value.period}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...value,
            period: event.target.value as TwelveHourPeriod,
          })
        }
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

interface ScheduleTimeInputProps {
  label: string;
  value: TwelveHourTime;
  onChange: (value: TwelveHourTime) => void;
  disabled?: boolean;
}

export function ScheduleTimeInput({
  label,
  value,
  onChange,
  disabled = false,
}: ScheduleTimeInputProps) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <ScheduleTimeSelects
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
