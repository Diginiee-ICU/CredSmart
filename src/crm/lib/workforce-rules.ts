export type PayrollPolicy = {
  configured: boolean;
  calendar: "all" | "sunday" | "weekly";
  weeklyOff: number;
  lateCredit: number;
  shiftStart: string;
  otRate: number;
};
export const DEFAULT_POLICY: PayrollPolicy = {
  configured: false, calendar: "all", weeklyOff: 0, lateCredit: 0.5, shiftStart: "", otRate: 0,
};
export function eligibleDates(month: string, policy: PayrollPolicy): string[] {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) return [];
  const count = new Date(year, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => i + 1)
    .filter((d) => policy.calendar === "all" || new Date(year, m - 1, d).getDay() !== (policy.calendar === "sunday" ? 0 : policy.weeklyOff))
    .map((d) => `${month}-${String(d).padStart(2, "0")}`);
}
export function isLate(inAt: number | undefined, shift: string): boolean {
  if (!inAt || !/^\d{2}:\d{2}$/.test(shift)) return false;
  const [h = 0, m = 0] = shift.split(":").map(Number);
  const time = new Date(inAt);
  return time.getHours() * 60 + time.getMinutes() > h * 60 + m;
}
export function roundMoney(n: number) { return Math.round(n * 100) / 100; }
export function validMeetingLink(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (!["meet.google.com", "meet.jit.si", "zoom.us"].some((h) => u.hostname === h || (h === "zoom.us" && u.hostname.endsWith(".zoom.us")))) return null;
    return u.href;
  } catch { return null; }
}