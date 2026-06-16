const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' });

export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
  return dateFormatter.format(new Date(value));
}
