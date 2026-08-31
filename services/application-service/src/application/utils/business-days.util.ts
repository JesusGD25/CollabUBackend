/** Suma N días hábiles (lunes a viernes, excluyendo festivos) a una fecha. */
export function addBusinessDays(startDate: Date, businessDays: number, holidays: string[] = []): Date {
  const holidaySet = new Set(holidays);
  const result = new Date(startDate);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result, holidaySet)) {
      remaining--;
    }
  }

  return result;
}

/** Cuenta los días hábiles transcurridos entre dos fechas (excluyendo festivos). */
export function countBusinessDaysBetween(from: Date, to: Date, holidays: string[] = []): number {
  const holidaySet = new Set(holidays);
  const cursor = new Date(from);
  let count = 0;

  while (cursor < to) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor, holidaySet)) {
      count++;
    }
  }

  return count;
}

function isBusinessDay(date: Date, holidaySet: Set<string>): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const isoDate = date.toISOString().slice(0, 10);
  return !holidaySet.has(isoDate);
}
