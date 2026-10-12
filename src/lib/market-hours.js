// True on weekdays from 9:00 AM until 4:05 PM New York time, so the
// closing print is still picked up a few minutes after the bell.
export function isMarketHoursET(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = get("weekday");
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  if (day === "Sat" || day === "Sun") return false;
  return minutes >= 9 * 60 && minutes < 16 * 60 + 5;
}
