export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const dayOfWeek = result.getDay();
  return new Date(result.getTime() - dayOfWeek * DAY_IN_MS);
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return endOfDay(new Date(start.getTime() + 6 * DAY_IN_MS));
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function buildDateOffsets(startDate: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, index) =>
    new Date(startDate.getTime() + index * DAY_IN_MS)
  );
}

export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined
): Map<string, T[]> {
  return items.reduce((map, item) => {
    const rawDate = getDate(item);
    if (!rawDate) {
      return map;
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return map;
    }

    const key = date.toDateString();
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
    return map;
  }, new Map<string, T[]>());
}

export function filterByDateRange<T>(
  items: T[],
  range: DateRange,
  getDate: (item: T) => string | Date | null | undefined
): T[] {
  const start = range.startDate.getTime();
  const end = range.endDate.getTime();

  return items.filter((item) => {
    const rawDate = getDate(item);
    if (!rawDate) {
      return false;
    }

    const date = new Date(rawDate);
    const time = date.getTime();
    if (Number.isNaN(time)) {
      return false;
    }

    return time >= start && time <= end;
  });
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}
