export const TIMEZONE = "Europe/Warsaw";
export function calendarDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

// Warsaw is UTC+1 or UTC+2; resolve both midnights separately across DST changes.
export function dayBounds(day: string): [string, string] {
  if (!validDate(day)) throw new Error("Niepoprawna data.");
  function midnight(utc: number) {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date(utc)));
    return new Date(utc - hour * 3600000).toISOString();
  }
  const start = Date.parse(`${day}T00:00:00Z`);
  return [midnight(start), midnight(start + 86400000)];
}
