export function eventStatus(status: string): string {
  if (["not_started", "scheduled"].includes(status)) return "scheduled";
  if (["first_half", "halftime", "second_half", "overtime", "extra_time", "penalties", "live"].includes(status)) return "live";
  if (status === "finished") return "finished";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (status === "postponed") return "postponed";
  return "unknown";
}
