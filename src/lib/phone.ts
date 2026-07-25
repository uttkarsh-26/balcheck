export function isTrueTollFreeNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.startsWith('1800');
}
