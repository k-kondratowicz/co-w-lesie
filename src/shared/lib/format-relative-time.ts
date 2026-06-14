const formatter = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

// Polish relative time, e.g. "2 godziny temu", "wczoraj". Past dates → negative values.
export function formatRelativeTime(date: Date | string | number): string {
  const value = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
  let duration = (value - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }

    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), 'years');
}
