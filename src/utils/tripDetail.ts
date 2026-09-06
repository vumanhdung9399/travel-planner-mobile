export type TripDetailSection = "info" | "timeline" | "tasks" | "finance" | "leader";
export type TripFinanceSection = "expenses" | "fund" | "balance";

export function resolveTripDetailTab(tab: string | undefined, canManage: boolean): {
  section: TripDetailSection;
  finance: TripFinanceSection;
} {
  if (tab === "expenses" || tab === "fund" || tab === "balance") {
    return { section: "finance", finance: tab };
  }
  const section = tab === "timeline" || tab === "tasks" || tab === "finance" ||
    (tab === "leader" && canManage) ? tab : "info";
  return { section, finance: "expenses" };
}

// API responses can contain an ISO timestamp; form drafts use HH:mm.
export function timelineClock(time: string): string {
  if (/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return time.slice(0, 5);
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function nearestTimelineDay(days: number[], target: number, duration: number): number {
  const bounded = Math.min(Math.max(target, 1), duration);
  return [...new Set(days)].filter(day => Number.isFinite(day) && day >= 1 && day <= duration)
    .sort((a, b) => Math.abs(a - bounded) - Math.abs(b - bounded) || a - b)[0] ?? bounded;
}
