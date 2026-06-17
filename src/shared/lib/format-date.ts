// Pinned to Europe/Warsaw so timestamps read the same whether formatted on the server (UTC) or in
// the browser - the app and its data are Polish, so local time is the only meaningful display.
const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Warsaw',
});
const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeZone: 'Europe/Warsaw' });

export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
  return dateFormatter.format(new Date(value));
}
