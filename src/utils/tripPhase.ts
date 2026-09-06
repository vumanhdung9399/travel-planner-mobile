export type TripPhase = "upcoming" | "current" | "past";

export const tripPhaseOptions: { value: TripPhase; label: string }[] = [
  { value: "upcoming", label: "Sắp tới" },
  { value: "current", label: "Đang đi" },
  { value: "past", label: "Đã qua" },
];

export function calendarDate(value: string): number {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getTripPhase(trip: { startDate: string; isCloseTrip: boolean }, now = Date.now()): TripPhase {
  if (trip.isCloseTrip) return "past";
  const start = calendarDate(trip.startDate);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  // Match FE: only explicitly closing a trip moves it to the past tab.
  return !Number.isFinite(start) || today.getTime() < start ? "upcoming" : "current";
}
