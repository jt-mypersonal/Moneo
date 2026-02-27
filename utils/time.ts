export function pad2(x: number) {
  return String(x).padStart(2, '0');
}

export function hoursToSeconds(h: number | string) {
  const n = Number(h);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 3600) : 0;
}

export function dateToHHMM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatTimeDisplay(hhmm: string | null) {
  if (!hhmm) return '--:--';
  const [hourStr, minuteStr] = hhmm.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${pad2(minute)} ${ampm}`;
}

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
